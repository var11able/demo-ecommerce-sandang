import { beforeEach, describe, expect, it } from "vitest";
import { GET as listAdminOrders } from "@/app/api/v1/admin/orders/route";
import { adminOrderListResponseSchema } from "@/contracts/admin";
import { getDb } from "@/server/db";
import type { FakePaymentGateway } from "@/server/payments/fake";
import { flatShippingFee } from "@/server/store";
import { registerAdmin, registerCustomer } from "../support/accounts";
import { adminOrder, cancelRequest, refundRequest, shipRequest } from "../support/admin";
import { createTestProduct } from "../support/catalogue";
import { resetDatabase } from "../support/database";
import { callRoute, readJson } from "../support/http";
import { placeTestOrder } from "../support/orders";
import {
  orderRow,
  paymentsOf,
  sendNotification,
  startTestPayment,
  useFakeGateway,
} from "../support/payments";

let gateway: FakePaymentGateway;

async function paidOrder(options: { price?: number; quantity?: number; stock?: number } = {}) {
  const customer = await registerCustomer({ name: "Sari Wulandari" });
  const product = await createTestProduct({
    variants: [{ price: options.price ?? 50000, stock: options.stock ?? 10 }],
  });
  const variantId = product.variants[0]!.id;
  const order = await placeTestOrder(customer.cookie, [
    { variantId, quantity: options.quantity ?? 2 },
  ]);
  await startTestPayment(customer.cookie, order.orderNumber);
  await sendNotification(gateway.notification(`${order.orderNumber}-1`, "paid"));
  return { customer, order, variantId };
}

async function listOrders(cookie: string, query: Record<string, string> = {}) {
  const response = await callRoute(listAdminOrders, { cookie, query });
  return {
    status: response.status,
    body:
      response.status === 200 ? adminOrderListResponseSchema.parse(await readJson(response)) : null,
  };
}

describe("Admin Orders", () => {
  beforeEach(async () => {
    await resetDatabase();
    gateway = useFakeGateway();
  });

  it("is closed to Customers and to visitors", async () => {
    const customer = await registerCustomer();
    expect((await listOrders(customer.cookie)).status).toBe(403);
    expect((await callRoute(listAdminOrders)).status).toBe(401);
  });

  it("shows paid Orders that are not yet shipped by default", async () => {
    const admin = await registerAdmin();
    const { order: paid } = await paidOrder();
    const customer = await registerCustomer();
    const product = await createTestProduct();
    await placeTestOrder(customer.cookie, [{ variantId: product.variants[0]!.id, quantity: 1 }]);

    const { body } = await listOrders(admin.cookie);
    expect(body?.orders.map((order) => order.orderNumber)).toEqual([paid.orderNumber]);
    expect(body?.orders[0]).toMatchObject({ customerName: "Sari Wulandari", status: "paid" });

    const all = await listOrders(admin.cookie, { status: "all" });
    expect(all.body?.orders).toHaveLength(2);
  });

  it("finds Orders by number or Customer email", async () => {
    const admin = await registerAdmin();
    const { order, customer } = await paidOrder();
    expect(
      (await listOrders(admin.cookie, { status: "all", q: order.orderNumber })).body?.orders,
    ).toHaveLength(1);
    expect(
      (await listOrders(admin.cookie, { status: "all", q: customer.email })).body?.orders,
    ).toHaveLength(1);
    expect(
      (await listOrders(admin.cookie, { status: "all", q: "nobody@example.com" })).body?.orders,
    ).toHaveLength(0);
  });

  it("marks a paid Order shipped, and only a paid one", async () => {
    const admin = await registerAdmin();
    const { order } = await paidOrder();
    expect((await shipRequest(admin.cookie, order.orderNumber)).status).toBe(200);
    expect((await orderRow(order.orderNumber)).status).toBe("shipped");
    expect((await shipRequest(admin.cookie, order.orderNumber)).status).toBe(409);
  });

  it("cancels an unpaid Order and releases its Reservation, but not a paid one", async () => {
    const admin = await registerAdmin();
    const customer = await registerCustomer();
    const product = await createTestProduct({ variants: [{ stock: 5 }] });
    const variantId = product.variants[0]!.id;
    const unpaid = await placeTestOrder(customer.cookie, [{ variantId, quantity: 2 }]);
    await startTestPayment(customer.cookie, unpaid.orderNumber);

    expect((await cancelRequest(admin.cookie, unpaid.orderNumber)).status).toBe(200);
    expect((await orderRow(unpaid.orderNumber)).status).toBe("cancelled");
    expect((await paymentsOf(unpaid.orderNumber))[0]?.status).toBe("failed");
    expect(
      await getDb().variant.findUniqueOrThrow({
        where: { id: variantId },
        select: { reserved: true },
      }),
    ).toEqual({ reserved: 0 });

    const { order: paid } = await paidOrder();
    expect((await cancelRequest(admin.cookie, paid.orderNumber)).status).toBe(409);
  });

  it("shows payments flagged for review", async () => {
    const admin = await registerAdmin();
    const customer = await registerCustomer();
    const product = await createTestProduct();
    const order = await placeTestOrder(customer.cookie, [
      { variantId: product.variants[0]!.id, quantity: 1 },
    ]);
    await startTestPayment(customer.cookie, order.orderNumber);
    await sendNotification(gateway.notification(`${order.orderNumber}-1`, "paid", { amount: 1 }));

    const detail = await adminOrder(admin.cookie, order.orderNumber);
    expect(detail.adminPayments[0]).toMatchObject({ needsReview: true });
    expect((await listOrders(admin.cookie, { status: "all" })).body?.orders[0]?.needsReview).toBe(
      true,
    );
  });
});

describe("Refunds", () => {
  beforeEach(async () => {
    await resetDatabase();
    gateway = useFakeGateway();
  });

  it("refunds part of a paid Order, then the rest, and marks the Order refunded", async () => {
    const admin = await registerAdmin();
    const { order } = await paidOrder({ price: 50000, quantity: 2 });
    const total = 100000 + flatShippingFee;

    const partial = await refundRequest(admin.cookie, order.orderNumber, 30000);
    expect(partial.status).toBe(201);
    let detail = await adminOrder(admin.cookie, order.orderNumber);
    expect(detail.status).toBe("paid");
    expect(detail.refundableAmount).toBe(total - 30000);
    expect(detail.adminPayments[0]?.status).toBe("partially_refunded");
    expect(detail.refunds).toEqual([
      expect.objectContaining({ amount: 30000, status: "succeeded", reason: "Damaged in transit" }),
    ]);

    expect((await refundRequest(admin.cookie, order.orderNumber, total - 30000)).status).toBe(201);
    detail = await adminOrder(admin.cookie, order.orderNumber);
    expect(detail.status).toBe("refunded");
    expect(detail.refundableAmount).toBe(0);
    expect(detail.adminPayments[0]?.status).toBe("refunded");
  });

  it("never refunds more than was paid", async () => {
    const admin = await registerAdmin();
    const { order } = await paidOrder({ price: 50000, quantity: 1 });
    const response = await refundRequest(
      admin.cookie,
      order.orderNumber,
      50000 + flatShippingFee + 1,
    );
    expect(response.status).toBe(409);
    expect(await getDb().refund.count()).toBe(0);
  });

  it("sends each Refund with its own key so a retry cannot refund twice", async () => {
    const admin = await registerAdmin();
    const { order } = await paidOrder();
    await refundRequest(admin.cookie, order.orderNumber, 10000);
    await refundRequest(admin.cookie, order.orderNumber, 10000);
    const refunds = await getDb().refund.findMany();
    expect(new Set(refunds.map((refund) => refund.gatewayRefundKey)).size).toBe(2);
    const transaction = gateway.transactions.get(`${order.orderNumber}-1`)!;
    expect(transaction.refunds.map((refund) => refund.refundKey)).toEqual(
      refunds.map((refund) => refund.gatewayRefundKey),
    );
  });

  it("leaves the Order unchanged and shows the reason when the gateway refuses", async () => {
    const admin = await registerAdmin();
    const { order } = await paidOrder();
    gateway.refuseRefunds = "Refund is not supported for this payment method";
    const response = await refundRequest(admin.cookie, order.orderNumber, 10000);
    expect(response.status).toBe(502);
    expect(await readJson(response)).toMatchObject({
      error: {
        message: expect.stringContaining("Refund is not supported for this payment method"),
      },
    });
    const detail = await adminOrder(admin.cookie, order.orderNumber);
    expect(detail.status).toBe("paid");
    expect(detail.adminPayments[0]?.status).toBe("paid");
    expect(detail.refunds[0]).toMatchObject({ status: "failed" });
  });

  it("refuses to refund an Order that was never paid", async () => {
    const admin = await registerAdmin();
    const customer = await registerCustomer();
    const product = await createTestProduct();
    const order = await placeTestOrder(customer.cookie, [
      { variantId: product.variants[0]!.id, quantity: 1 },
    ]);
    expect((await refundRequest(admin.cookie, order.orderNumber, 1000)).status).toBe(409);
  });

  it("lets the Customer see the Refund on their Order", async () => {
    const admin = await registerAdmin();
    const { order, customer } = await paidOrder();
    await refundRequest(admin.cookie, order.orderNumber, 15000, "One jar arrived broken");
    const { GET } = await import("@/app/api/v1/orders/[orderNumber]/route");
    const response = await callRoute(GET, {
      cookie: customer.cookie,
      params: { orderNumber: order.orderNumber },
    });
    const body = (await readJson(response)) as { order: { refunds: unknown[] } };
    expect(body.order.refunds).toEqual([
      expect.objectContaining({
        amount: 15000,
        reason: "One jar arrived broken",
        status: "succeeded",
      }),
    ]);
  });
});

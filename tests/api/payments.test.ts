import { beforeEach, describe, expect, it } from "vitest";
import { GET as getOrder } from "@/app/api/v1/orders/[orderNumber]/route";
import { orderDetailResponseSchema } from "@/contracts/orders";
import { getDb } from "@/server/db";
import type { FakePaymentGateway } from "@/server/payments/fake";
import { flatShippingFee } from "@/server/store";
import { registerCustomer } from "../support/accounts";
import { createTestProduct } from "../support/catalogue";
import { resetDatabase } from "../support/database";
import { callRoute, readJson } from "../support/http";
import { placeTestOrder } from "../support/orders";
import {
  orderRow,
  paymentsOf,
  readPaymentStatus,
  sendNotification,
  startPaymentRequest,
  startTestPayment,
  useFakeGateway,
} from "../support/payments";

let gateway: FakePaymentGateway;

async function variantState(variantId: string) {
  return getDb().variant.findUniqueOrThrow({
    where: { id: variantId },
    select: { stock: true, reserved: true },
  });
}

async function orderWithPayment(
  options: { stock?: number; quantity?: number; price?: number } = {},
) {
  const customer = await registerCustomer();
  const product = await createTestProduct({
    variants: [{ stock: options.stock ?? 10, price: options.price ?? 50000 }],
  });
  const variantId = product.variants[0]!.id;
  const order = await placeTestOrder(customer.cookie, [
    { variantId, quantity: options.quantity ?? 2 },
  ]);
  const payment = await startTestPayment(customer.cookie, order.orderNumber);
  const reference = `${order.orderNumber}-1`;
  return { customer, order, payment, reference, variantId };
}

async function readOrder(cookie: string, orderNumber: string) {
  const response = await callRoute(getOrder, { cookie, params: { orderNumber } });
  return orderDetailResponseSchema.parse(await readJson(response)).order;
}

describe("starting a Payment", () => {
  beforeEach(async () => {
    await resetDatabase();
    gateway = useFakeGateway();
  });

  it("creates a pending Payment for the Order total and returns the gateway token", async () => {
    const { order, payment, reference } = await orderWithPayment({ quantity: 2, price: 50000 });
    expect(payment.token).toBe(`fake-token-${reference}`);

    const [row] = await paymentsOf(order.orderNumber);
    expect(row).toMatchObject({
      status: "pending",
      amount: 100000 + flatShippingFee,
      gatewayReference: reference,
      attempt: 1,
      gateway: "fake",
      snapToken: payment.token,
    });

    const sent = gateway.created[0]!;
    expect(sent.amount).toBe(100000 + flatShippingFee);
    expect(sent.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)).toBe(
      sent.amount,
    );
    expect(sent.expiryMinutes).toBe(60);
  });

  it("hands back the same token while that Payment is still open", async () => {
    const { customer, order, payment } = await orderWithPayment();
    const again = await startTestPayment(customer.cookie, order.orderNumber);
    expect(again.token).toBe(payment.token);
    expect(await paymentsOf(order.orderNumber)).toHaveLength(1);
  });

  it("answers not found for another Customer's Order", async () => {
    const { order } = await orderWithPayment();
    const stranger = await registerCustomer();
    expect((await startPaymentRequest(stranger.cookie, order.orderNumber)).status).toBe(404);
  });

  it("marks the Payment failed and says so when the gateway refuses", async () => {
    const customer = await registerCustomer();
    const product = await createTestProduct();
    const order = await placeTestOrder(customer.cookie, [
      { variantId: product.variants[0]!.id, quantity: 1 },
    ]);
    gateway.failNextCreate = true;
    const response = await startPaymentRequest(customer.cookie, order.orderNumber);
    expect(response.status).toBe(502);
    expect((await paymentsOf(order.orderNumber))[0]?.status).toBe("failed");
  });

  it("refuses to start a Payment for an Order past its pay-by time", async () => {
    const customer = await registerCustomer();
    const product = await createTestProduct();
    const order = await placeTestOrder(customer.cookie, [
      { variantId: product.variants[0]!.id, quantity: 1 },
    ]);
    await getDb().order.update({
      where: { orderNumber: order.orderNumber },
      data: { payBy: new Date(Date.now() - 1000) },
    });
    const response = await startPaymentRequest(customer.cookie, order.orderNumber);
    expect(response.status).toBe(409);
    expect((await orderRow(order.orderNumber)).status).toBe("cancelled");
  });

  it("limits each Order to five Payment starts an hour", async () => {
    const { customer, order } = await orderWithPayment();
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      statuses.push((await startPaymentRequest(customer.cookie, order.orderNumber)).status);
    }
    expect(statuses).toEqual([201, 201, 201, 201, 429]);
  });
});

describe("Notifications", () => {
  beforeEach(async () => {
    await resetDatabase();
    gateway = useFakeGateway();
  });

  it("marks the Payment and the Order paid and turns the Reservation into a Stock deduction", async () => {
    const { customer, order, reference, variantId } = await orderWithPayment({
      stock: 10,
      quantity: 2,
    });
    expect(await variantState(variantId)).toEqual({ stock: 10, reserved: 2 });

    const response = await sendNotification(
      gateway.notification(reference, "paid", { method: "qris" }),
    );
    expect(response.status).toBe(200);

    const [payment] = await paymentsOf(order.orderNumber);
    expect(payment).toMatchObject({ status: "paid", method: "qris" });
    expect(payment?.paidAt).not.toBeNull();
    const reread = await readOrder(customer.cookie, order.orderNumber);
    expect(reread.status).toBe("paid");
    expect(reread.paidAt).not.toBeNull();
    expect(reread.canPay).toBe(false);
    expect(await variantState(variantId)).toEqual({ stock: 8, reserved: 0 });
  });

  it("saves every Notification before acting on it", async () => {
    const { reference } = await orderWithPayment();
    const body = gateway.notification(reference, "paid");
    await sendNotification(body);
    const saved = await getDb().paymentNotification.findMany();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      signatureValid: true,
      applied: true,
      gatewayReference: reference,
      rawBody: JSON.stringify(body),
    });
  });

  it("changes nothing when the same Notification arrives twice", async () => {
    const { order, reference, variantId } = await orderWithPayment({ stock: 10, quantity: 2 });
    const body = gateway.notification(reference, "paid");
    expect((await sendNotification(body)).status).toBe(200);
    expect((await sendNotification(body)).status).toBe(200);
    expect(await variantState(variantId)).toEqual({ stock: 8, reserved: 0 });
    expect((await paymentsOf(order.orderNumber))[0]?.status).toBe("paid");
    expect(await getDb().paymentNotification.count()).toBe(2);
  });

  it("refuses a Notification with a bad signature and changes nothing", async () => {
    const { order, reference, variantId } = await orderWithPayment();
    const forged = { ...gateway.notification(reference, "paid"), signature: "0".repeat(64) };
    const response = await sendNotification(forged);
    expect(response.status).toBe(401);
    expect((await paymentsOf(order.orderNumber))[0]?.status).toBe("pending");
    expect((await orderRow(order.orderNumber)).status).toBe("awaiting_payment");
    expect(await variantState(variantId)).toEqual({ stock: 10, reserved: 2 });
    const saved = await getDb().paymentNotification.findFirstOrThrow();
    expect(saved).toMatchObject({ signatureValid: false, applied: false });
  });

  it("refuses a body that is not JSON", async () => {
    const response = await sendNotification("not json");
    expect(response.status).toBe(401);
  });

  it("acknowledges a valid Notification for an unknown Payment and does nothing else", async () => {
    gateway.transactions.set("SDG-20260101-0001-1", {
      reference: "SDG-20260101-0001-1",
      amount: 1000,
      status: "untouched",
      refunds: [],
    });
    const response = await sendNotification(gateway.notification("SDG-20260101-0001-1", "paid"));
    expect(response.status).toBe(200);
  });

  it("never moves a paid Payment back to pending when Notifications arrive out of order", async () => {
    const { order, reference } = await orderWithPayment();
    await sendNotification(gateway.notification(reference, "paid"));
    await sendNotification(gateway.notification(reference, "pending"));
    await sendNotification(gateway.notification(reference, "expired"));
    expect((await paymentsOf(order.orderNumber))[0]?.status).toBe("paid");
    expect((await orderRow(order.orderNumber)).status).toBe("paid");
  });

  it("does not mark anything paid when the amount does not match, and flags it for an Admin", async () => {
    const { order, reference, variantId } = await orderWithPayment();
    const response = await sendNotification(
      gateway.notification(reference, "paid", { amount: 1000 }),
    );
    expect(response.status).toBe(200);
    const [payment] = await paymentsOf(order.orderNumber);
    expect(payment).toMatchObject({ status: "pending", needsReview: true });
    expect(payment?.reviewReason).toMatch(/amount/i);
    expect((await orderRow(order.orderNumber)).status).toBe("awaiting_payment");
    expect(await variantState(variantId)).toEqual({ stock: 10, reserved: 2 });
  });

  it("leaves the Order awaiting payment when a Payment fails, so the Customer can pay again", async () => {
    const { customer, order, reference } = await orderWithPayment();
    await sendNotification(gateway.notification(reference, "failed"));
    expect((await paymentsOf(order.orderNumber))[0]?.status).toBe("failed");
    const reread = await readOrder(customer.cookie, order.orderNumber);
    expect(reread.status).toBe("awaiting_payment");
    expect(reread.canPay).toBe(true);
  });

  it("flags a second paid Payment on an Order that is already paid instead of taking the money twice", async () => {
    const { customer, order, reference, variantId } = await orderWithPayment({ quantity: 1 });
    await sendNotification(gateway.notification(reference, "failed"));
    await startTestPayment(customer.cookie, order.orderNumber);
    const secondReference = `${order.orderNumber}-2`;

    await sendNotification(gateway.notification(secondReference, "paid"));
    await sendNotification(gateway.notification(reference, "paid"));

    const payments = await paymentsOf(order.orderNumber);
    expect(payments.map(({ status, needsReview }) => ({ status, needsReview }))).toEqual([
      { status: "paid", needsReview: true },
      { status: "paid", needsReview: false },
    ]);
    expect(await variantState(variantId)).toEqual({ stock: 9, reserved: 0 });
  });

  it("flags money received for an Order that was already cancelled", async () => {
    const { customer, order, reference, variantId } = await orderWithPayment();
    await getDb().order.update({
      where: { orderNumber: order.orderNumber },
      data: { payBy: new Date(Date.now() - 1000) },
    });
    gateway.setStatus(reference, "expired");
    await getDb().payment.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await readPaymentStatus(customer.cookie, order.orderNumber);
    expect((await orderRow(order.orderNumber)).status).toBe("cancelled");

    await sendNotification(gateway.notification(reference, "paid"));
    const [payment] = await paymentsOf(order.orderNumber);
    expect(payment).toMatchObject({ status: "paid", needsReview: true });
    expect((await orderRow(order.orderNumber)).status).toBe("cancelled");
    expect(await variantState(variantId)).toEqual({ stock: 10, reserved: 0 });
  });
});

describe("asking the gateway directly", () => {
  beforeEach(async () => {
    await resetDatabase();
    gateway = useFakeGateway();
  });

  it("applies a settlement found by a status check when no Notification arrived", async () => {
    const { customer, order, reference } = await orderWithPayment();
    gateway.setStatus(reference, "paid", "bank_transfer");
    const status = await readPaymentStatus(customer.cookie, order.orderNumber);
    expect(status.orderStatus).toBe("paid");
    expect(status.payment).toMatchObject({ status: "paid", method: "bank_transfer", token: null });
  });

  it("reports a pending Payment with its token so the instructions can be shown again", async () => {
    const { customer, order, payment, reference } = await orderWithPayment();
    gateway.setStatus(reference, "pending", "bank_transfer");
    const status = await readPaymentStatus(customer.cookie, order.orderNumber);
    expect(status).toMatchObject({ orderStatus: "awaiting_payment", canPay: false });
    expect(status.payment).toMatchObject({
      status: "pending",
      method: "bank_transfer",
      token: payment.token,
    });
  });

  it("still answers when the gateway cannot be reached", async () => {
    const { customer, order } = await orderWithPayment();
    gateway.failStatusChecks = true;
    const status = await readPaymentStatus(customer.cookie, order.orderNumber);
    expect(status.payment?.status).toBe("pending");
  });
});

describe("Expiry", () => {
  beforeEach(async () => {
    await resetDatabase();
    gateway = useFakeGateway();
  });

  async function makeOverdue(orderNumber: string, options: { orderToo?: boolean } = {}) {
    await getDb().payment.updateMany({
      where: { order: { orderNumber } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    if (options.orderToo) {
      await getDb().order.update({
        where: { orderNumber },
        data: { payBy: new Date(Date.now() - 1000) },
      });
    }
  }

  it("expires an overdue Payment when the Order is read, and lets the Customer pay again", async () => {
    const { customer, order, reference } = await orderWithPayment();
    gateway.setStatus(reference, "expired");
    await makeOverdue(order.orderNumber);

    const reread = await readOrder(customer.cookie, order.orderNumber);
    expect(reread.status).toBe("awaiting_payment");
    expect(reread.canPay).toBe(true);
    expect(reread.payments.map((payment) => payment.status)).toEqual(["expired"]);

    const again = await startTestPayment(customer.cookie, order.orderNumber);
    expect(again.token).toBe(`fake-token-${order.orderNumber}-2`);
  });

  it("expires an overdue Payment the Customer never opened", async () => {
    const { customer, order } = await orderWithPayment();
    await makeOverdue(order.orderNumber);
    const reread = await readOrder(customer.cookie, order.orderNumber);
    expect(reread.payments.map((payment) => payment.status)).toEqual(["expired"]);
  });

  it("cancels the Order and releases the Reservation once the pay-by time has passed", async () => {
    const { customer, order, reference, variantId } = await orderWithPayment();
    gateway.setStatus(reference, "expired");
    await makeOverdue(order.orderNumber, { orderToo: true });
    const reread = await readOrder(customer.cookie, order.orderNumber);
    expect(reread.status).toBe("cancelled");
    expect(await variantState(variantId)).toEqual({ stock: 10, reserved: 0 });
  });

  it("does not cancel an Order whose overdue Payment turns out to be paid", async () => {
    const { customer, order, reference, variantId } = await orderWithPayment();
    gateway.setStatus(reference, "paid");
    await makeOverdue(order.orderNumber, { orderToo: true });
    const reread = await readOrder(customer.cookie, order.orderNumber);
    expect(reread.status).toBe("paid");
    expect(await variantState(variantId)).toEqual({ stock: 8, reserved: 0 });
  });

  it("keeps a pending Payment open while the gateway cannot be reached", async () => {
    const { customer, order } = await orderWithPayment();
    gateway.failStatusChecks = true;
    await makeOverdue(order.orderNumber, { orderToo: true });
    const reread = await readOrder(customer.cookie, order.orderNumber);
    expect(reread.status).toBe("awaiting_payment");
    expect(reread.payments[0]?.status).toBe("pending");
  });
});

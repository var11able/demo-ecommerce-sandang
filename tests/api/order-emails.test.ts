import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/server/db";
import { listRecordedEmails } from "@/server/email";
import type { FakePaymentGateway } from "@/server/payments/fake";
import { registerAdmin, registerCustomer } from "../support/accounts";
import { shipRequest } from "../support/admin";
import { createTestProduct } from "../support/catalogue";
import { resetDatabase } from "../support/database";
import { placeTestOrder } from "../support/orders";
import { sendNotification, startTestPayment, useFakeGateway } from "../support/payments";

let gateway: FakePaymentGateway;

async function orderWithPayment() {
  const customer = await registerCustomer({ name: "Sari Wulandari" });
  const product = await createTestProduct({
    name: "Boxy Tee",
    variants: [{ name: "M", price: 179000, stock: 10 }],
  });
  const order = await placeTestOrder(customer.cookie, [
    { variantId: product.variants[0]!.id, quantity: 2 },
  ]);
  await startTestPayment(customer.cookie, order.orderNumber);
  return { customer, order, reference: `${order.orderNumber}-1` };
}

async function emailsOfKind(kind: "order_confirmed" | "order_shipped") {
  return getDb().emailMessage.findMany({ where: { kind } });
}

describe("order emails", () => {
  beforeEach(async () => {
    await resetDatabase();
    gateway = useFakeGateway();
  });

  it("records one Order confirmation when the Payment is paid, however often Midtrans says so", async () => {
    const { customer, order, reference } = await orderWithPayment();
    expect(await emailsOfKind("order_confirmed")).toEqual([]);

    await sendNotification(gateway.notification(reference, "paid"));
    await sendNotification(gateway.notification(reference, "paid"));

    const emails = await emailsOfKind("order_confirmed");
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({
      toAddress: customer.email,
      customerId: customer.id,
      status: "recorded",
    });
    expect(emails[0]?.subject).toContain(order.orderNumber);
    expect(emails[0]?.body).toContain("Sari Wulandari");
    expect(emails[0]?.body).toContain("Boxy Tee, M × 2");
    expect(emails[0]?.body).toContain("Rp 378.000");
  });

  it("records no confirmation for a Payment that did not settle", async () => {
    const { reference } = await orderWithPayment();
    await sendNotification(gateway.notification(reference, "failed"));
    expect(await emailsOfKind("order_confirmed")).toEqual([]);
  });

  it("records one shipping email when an Admin marks the Order shipped", async () => {
    const admin = await registerAdmin();
    const { customer, order, reference } = await orderWithPayment();
    await sendNotification(gateway.notification(reference, "paid"));

    expect((await shipRequest(admin.cookie, order.orderNumber)).status).toBe(200);
    expect((await shipRequest(admin.cookie, order.orderNumber)).status).toBe(409);

    const emails = await emailsOfKind("order_shipped");
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({ toAddress: customer.email });
    expect(emails[0]?.subject).toContain(order.orderNumber);
  });

  it("lists recorded emails newest first", async () => {
    const admin = await registerAdmin();
    const { order, reference } = await orderWithPayment();
    await sendNotification(gateway.notification(reference, "paid"));
    await shipRequest(admin.cookie, order.orderNumber);

    expect((await listRecordedEmails()).map((email) => email.kind)).toEqual([
      "order_shipped",
      "order_confirmed",
    ]);
  });
});

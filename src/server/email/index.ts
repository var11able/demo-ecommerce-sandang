import "server-only";
import { getDb, type Transaction } from "../db";
import { readEnvironment } from "../env";
import { outboxMailer, type EmailKind } from "./mailer";
import {
  orderConfirmedEmail,
  orderShippedEmail,
  passwordResetEmail,
  type OrderForEmail,
} from "./templates";

export type { EmailKind, Mailer, OutgoingEmail } from "./mailer";

export type RecordedEmail = {
  id: string;
  kind: EmailKind;
  to: string;
  subject: string;
  body: string;
  status: "recorded" | "sent" | "failed";
  createdAt: string;
};

function storeUrl(path: string): string {
  return new URL(path, readEnvironment().APP_ORIGIN).toString();
}

async function loadOrder(tx: Transaction, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      lines: { orderBy: { createdAt: "asc" } },
    },
  });
  const forEmail: OrderForEmail = {
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    recipientName: order.recipientName,
    street: order.street,
    district: order.district,
    city: order.city,
    province: order.province,
    postalCode: order.postalCode,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    total: order.total,
    lines: order.lines.map((line) => ({
      productName: line.productName,
      variantName: line.variantName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    })),
  };
  return { order, forEmail };
}

async function recordOrderEmail(
  tx: Transaction,
  orderId: string,
  kind: "order_confirmed" | "order_shipped",
): Promise<void> {
  const { order, forEmail } = await loadOrder(tx, orderId);
  const orderUrl = storeUrl(`/orders/${order.orderNumber}`);
  const content =
    kind === "order_confirmed"
      ? orderConfirmedEmail(forEmail, orderUrl)
      : orderShippedEmail(forEmail, orderUrl);
  await outboxMailer.send(tx, {
    kind,
    dedupeKey: `${kind}:${order.id}`,
    customerId: order.customer.id,
    orderId: order.id,
    to: order.customer.email,
    ...content,
  });
}

export function recordOrderConfirmed(tx: Transaction, orderId: string): Promise<void> {
  return recordOrderEmail(tx, orderId, "order_confirmed");
}

export function recordOrderShipped(tx: Transaction, orderId: string): Promise<void> {
  return recordOrderEmail(tx, orderId, "order_shipped");
}

export async function recordPasswordReset(
  tx: Transaction,
  reset: { id: string; token: string; minutes: number },
  customer: { id: string; email: string; name: string },
): Promise<void> {
  const resetUrl = storeUrl(`/reset-password?token=${reset.token}`);
  await outboxMailer.send(tx, {
    kind: "password_reset",
    dedupeKey: `password_reset:${reset.id}`,
    customerId: customer.id,
    orderId: null,
    to: customer.email,
    ...passwordResetEmail(customer.name, resetUrl, reset.minutes),
  });
}

export async function listRecordedEmails(limit = 100): Promise<RecordedEmail[]> {
  const emails = await getDb().emailMessage.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });
  return emails.map((email) => ({
    id: email.id,
    kind: email.kind,
    to: email.toAddress,
    subject: email.subject,
    body: email.body,
    status: email.status,
    createdAt: email.createdAt.toISOString(),
  }));
}

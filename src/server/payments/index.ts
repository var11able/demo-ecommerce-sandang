import "server-only";
import type { PaymentStatusResponse, StartedPayment } from "@/contracts/payments";
import type { SessionCustomer } from "../accounts";
import { getDb } from "../db";
import { readEnvironment } from "../env";
import { StoreError, notFound } from "../errors";
import { cancelUnpaidOrder, findCustomerOrderId, lockOrder } from "../orders/settle";
import { hasOpenPayment, minimumMinutesToPay, orderCanBePaid } from "../orders/views";
import { consumeRateLimits, rateLimits } from "../rate-limit";
import { applyPaymentUpdate } from "./apply";
import { GatewayError } from "./gateway";
import { getPaymentGateway } from "./registry";

export { applyPaymentUpdate, isForwardMove, type ApplyOutcome } from "./apply";
export { findRefundablePayment, refundOrderPayment } from "./refunds";
export type { PaymentGateway, PaymentUpdate } from "./gateway";
export { getPaymentGateway, usePaymentGateway } from "./registry";

export const paymentExpiryMinutes = 60;
const reuseMarginMs = 60 * 1000;

async function requireCustomerOrderId(customerId: string, orderNumber: string): Promise<string> {
  const orderId = await findCustomerOrderId(customerId, orderNumber);
  if (!orderId) {
    throw notFound("Order not found");
  }
  return orderId;
}

export async function refreshPayment(paymentId: string, now: Date = new Date()): Promise<void> {
  const payment = await getDb().payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "pending") {
    return;
  }
  let update;
  try {
    update = await getPaymentGateway().fetchStatus(payment.gatewayReference);
  } catch (error) {
    if (error instanceof GatewayError) {
      return;
    }
    throw error;
  }
  if (update) {
    await applyPaymentUpdate(update, now);
    return;
  }
  if (payment.expiresAt && payment.expiresAt <= now) {
    await getDb().payment.updateMany({
      where: { id: payment.id, status: "pending" },
      data: { status: "expired" },
    });
  }
}

export async function settleOrder(orderId: string, now: Date = new Date()): Promise<void> {
  const overduePayments = await getDb().payment.findMany({
    where: { orderId, status: "pending", expiresAt: { lte: now } },
    select: { id: true },
  });
  for (const payment of overduePayments) {
    await refreshPayment(payment.id, now);
  }
  const order = await getDb().order.findUnique({
    where: { id: orderId },
    select: { status: true, payBy: true },
  });
  if (order?.status === "awaiting_payment" && order.payBy <= now) {
    await cancelUnpaidOrder(orderId, now);
  }
}

async function settleOrdersWhere(where: { customerId?: string }, now: Date): Promise<number> {
  const orders = await getDb().order.findMany({
    where: {
      ...where,
      status: "awaiting_payment",
      OR: [
        { payBy: { lte: now } },
        { payments: { some: { status: "pending", expiresAt: { lte: now } } } },
      ],
    },
    select: { id: true },
  });
  for (const order of orders) {
    await settleOrder(order.id, now);
  }
  return orders.length;
}

export function settleOrdersOfCustomer(customerId: string, now: Date = new Date()) {
  return settleOrdersWhere({ customerId }, now);
}

export function settleAllOverdueOrders(now: Date = new Date()) {
  return settleOrdersWhere({}, now);
}

export async function startPayment(
  customer: SessionCustomer,
  orderNumber: string,
  now: Date = new Date(),
): Promise<StartedPayment> {
  const orderId = await requireCustomerOrderId(customer.id, orderNumber);
  await consumeRateLimits([rateLimits.startPaymentPerOrder(orderId)], now);
  await settleOrder(orderId, now);

  const db = getDb();
  const prepared = await db.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    const payments = await tx.payment.findMany({ where: { orderId }, orderBy: { attempt: "asc" } });
    const reusable = payments.find(
      (payment) =>
        payment.status === "pending" &&
        payment.snapToken &&
        payment.redirectUrl &&
        payment.expiresAt &&
        payment.expiresAt.getTime() > now.getTime() + reuseMarginMs,
    );
    if (reusable?.snapToken && reusable.redirectUrl && reusable.expiresAt) {
      return {
        kind: "reuse" as const,
        payment: {
          token: reusable.snapToken,
          redirectUrl: reusable.redirectUrl,
          expiresAt: reusable.expiresAt.toISOString(),
        },
      };
    }
    if (!order || !orderCanBePaid({ ...order, payments }, now)) {
      throw new StoreError(
        "conflict",
        hasOpenPayment(payments, now)
          ? "A payment for this order is already open."
          : "This order can no longer be paid.",
      );
    }
    const attempt = (payments.at(-1)?.attempt ?? 0) + 1;
    const expiresAt = new Date(
      Math.min(now.getTime() + paymentExpiryMinutes * 60 * 1000, order.payBy.getTime()),
    );
    const payment = await tx.payment.create({
      data: {
        orderId,
        gateway: getPaymentGateway().name,
        gatewayReference: `${orderNumber}-${attempt}`,
        attempt,
        amount: order.total,
        expiresAt,
      },
    });
    return { kind: "new" as const, payment };
  });

  if (prepared.kind === "reuse") {
    return prepared.payment;
  }

  const { payment } = prepared;
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { lines: true },
  });
  const expiryMinutes = Math.max(
    minimumMinutesToPay,
    Math.floor(((payment.expiresAt?.getTime() ?? now.getTime()) - now.getTime()) / 60000),
  );

  try {
    const created = await getPaymentGateway().createPayment({
      reference: payment.gatewayReference,
      amount: payment.amount,
      customer: { name: customer.name, email: customer.email },
      lines: [
        ...order.lines.map((line) => ({
          id: line.variantId,
          name: `${line.productName} ${line.variantName}`,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
        })),
        { id: "shipping", name: "Shipping fee", unitPrice: order.shippingFee, quantity: 1 },
      ],
      expiryMinutes,
      finishUrl: `${readEnvironment().APP_ORIGIN}/orders/${orderNumber}/confirmation`,
    });
    await db.payment.update({
      where: { id: payment.id },
      data: {
        snapToken: created.token,
        redirectUrl: created.redirectUrl,
        expiresAt: created.expiresAt,
      },
    });
    return {
      token: created.token,
      redirectUrl: created.redirectUrl,
      expiresAt: created.expiresAt.toISOString(),
    };
  } catch (error) {
    if (!(error instanceof GatewayError)) {
      throw error;
    }
    await db.payment.update({ where: { id: payment.id }, data: { status: "failed" } });
    throw new StoreError("gateway_error", "We could not start the payment. Try again in a moment.");
  }
}

export async function getPaymentStatus(
  customerId: string,
  orderNumber: string,
  now: Date = new Date(),
): Promise<PaymentStatusResponse> {
  const orderId = await requireCustomerOrderId(customerId, orderNumber);
  await settleOrder(orderId, now);
  const latest = await getDb().payment.findFirst({
    where: { orderId },
    orderBy: { attempt: "desc" },
  });
  if (latest?.status === "pending") {
    await refreshPayment(latest.id, now);
  }
  const order = await getDb().order.findUniqueOrThrow({
    where: { id: orderId },
    include: { payments: { orderBy: { attempt: "asc" } } },
  });
  const payment = order.payments.at(-1);
  return {
    orderNumber: order.orderNumber,
    orderStatus: order.status,
    canPay: orderCanBePaid(order, now),
    payBy: order.payBy.toISOString(),
    payment: payment
      ? {
          status: payment.status,
          method: payment.method,
          amount: payment.amount,
          createdAt: payment.createdAt.toISOString(),
          expiresAt: payment.expiresAt?.toISOString() ?? null,
          token:
            payment.status === "pending" && payment.expiresAt && payment.expiresAt > now
              ? payment.snapToken
              : null,
        }
      : null,
    checkedAt: now.toISOString(),
  };
}

export type NotificationResult = { accepted: boolean };

export async function receiveNotification(
  rawBody: string,
  now: Date = new Date(),
): Promise<NotificationResult> {
  const db = getDb();
  const saved = await db.paymentNotification.create({
    data: { rawBody, signatureValid: false, receivedAt: now },
  });

  let body: unknown = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }
  const update = getPaymentGateway().parseNotification(body);
  if (!update) {
    await db.paymentNotification.update({
      where: { id: saved.id },
      data: { outcome: "invalid_signature" },
    });
    return { accepted: false };
  }

  const outcome = await applyPaymentUpdate(update, now);
  const payment = await db.payment.findUnique({
    where: { gatewayReference: update.reference },
    select: { id: true },
  });
  await db.paymentNotification.update({
    where: { id: saved.id },
    data: {
      signatureValid: true,
      gatewayReference: update.reference,
      paymentId: payment?.id ?? null,
      applied: outcome === "applied" || outcome === "flagged_for_review",
      outcome,
    },
  });
  return { accepted: true };
}

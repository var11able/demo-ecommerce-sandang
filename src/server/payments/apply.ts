import "server-only";
import type { PaymentStatus } from "@/contracts/orders";
import { getDb, type Transaction } from "../db";
import { recordOrderConfirmed } from "../email";
import { lockOrder } from "../orders/settle";
import { deductReservedStock } from "../stock";
import type { PaymentUpdate } from "./gateway";

export type ApplyOutcome =
  "applied" | "ignored" | "unknown_payment" | "amount_mismatch" | "flagged_for_review";

const progress: Record<PaymentStatus, number> = {
  pending: 0,
  failed: 1,
  expired: 1,
  paid: 2,
  partially_refunded: 3,
  refunded: 4,
};

export function isForwardMove(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === "partially_refunded" && to === "partially_refunded") {
    return true;
  }
  return progress[to] > progress[from];
}

type LockedPayment = {
  id: string;
  order_id: string;
  status: PaymentStatus;
  amount: number;
  method: string | null;
};

async function lockPayment(tx: Transaction, reference: string): Promise<LockedPayment | undefined> {
  const [payment] = await tx.$queryRaw<LockedPayment[]>`
    SELECT "id", "order_id", "status"::text AS "status", "amount", "method"
    FROM "payment" WHERE "gateway_reference" = ${reference} FOR UPDATE
  `;
  return payment;
}

async function flag(tx: Transaction, paymentId: string, reason: string): Promise<void> {
  await tx.payment.update({
    where: { id: paymentId },
    data: { needsReview: true, reviewReason: reason },
  });
}

async function applyPaid(
  tx: Transaction,
  payment: LockedPayment,
  update: PaymentUpdate,
  now: Date,
): Promise<ApplyOutcome> {
  const order = await lockOrder(tx, payment.order_id);
  const alreadyPaid = await tx.payment.count({
    where: {
      orderId: payment.order_id,
      id: { not: payment.id },
      status: { in: ["paid", "partially_refunded", "refunded"] },
      needsReview: false,
    },
  });
  const reviewReason =
    alreadyPaid > 0
      ? "Another Payment for this Order was already paid. Refund this one."
      : order?.status !== "awaiting_payment"
        ? `Money arrived for an Order that is ${order?.status ?? "missing"}. Refund it or restore the Order.`
        : null;

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: "paid",
      paidAt: now,
      method: update.method ?? payment.method,
      ...(reviewReason ? { needsReview: true, reviewReason } : {}),
    },
  });
  if (reviewReason) {
    return "flagged_for_review";
  }

  const lines = await tx.orderLine.findMany({
    where: { orderId: payment.order_id },
    select: { variantId: true, quantity: true },
  });
  await deductReservedStock(tx, lines);
  await tx.order.update({ where: { id: payment.order_id }, data: { status: "paid", paidAt: now } });
  await recordOrderConfirmed(tx, payment.order_id);
  return "applied";
}

export async function applyPaymentUpdate(
  update: PaymentUpdate,
  now: Date = new Date(),
): Promise<ApplyOutcome> {
  return getDb().$transaction(async (tx) => {
    const payment = await lockPayment(tx, update.reference);
    if (!payment) {
      return "unknown_payment";
    }
    if (!Number.isInteger(update.amount) || update.amount !== payment.amount) {
      await flag(
        tx,
        payment.id,
        `The gateway reported ${update.amount} for a Payment of ${payment.amount}. Check the amount before acting.`,
      );
      return "amount_mismatch";
    }
    if (!isForwardMove(payment.status, update.status)) {
      if (update.status === payment.status && update.method && update.method !== payment.method) {
        await tx.payment.update({ where: { id: payment.id }, data: { method: update.method } });
        return "applied";
      }
      return "ignored";
    }

    switch (update.status) {
      case "paid":
        return applyPaid(tx, payment, update, now);
      case "refunded":
      case "partially_refunded": {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: update.status, method: update.method ?? payment.method },
        });
        if (update.status === "refunded") {
          await tx.order.updateMany({
            where: { id: payment.order_id, status: { in: ["paid", "shipped", "completed"] } },
            data: { status: "refunded" },
          });
        }
        return "applied";
      }
      default:
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: update.status, method: update.method ?? payment.method },
        });
        return "applied";
    }
  });
}

import "server-only";
import { randomBytes } from "node:crypto";
import { getDb } from "../db";
import { StoreError } from "../errors";
import { lockOrder } from "../orders/settle";
import { GatewayError } from "./gateway";
import { getPaymentGateway } from "./registry";

const refundedStatuses = ["paid", "partially_refunded", "refunded"] as const;

export async function findRefundablePayment(orderId: string) {
  const payment = await getDb().payment.findFirst({
    where: { orderId, status: { in: [...refundedStatuses] }, needsReview: false },
    include: { refunds: true },
  });
  if (!payment) {
    return null;
  }
  const committed = payment.refunds
    .filter((refund) => refund.status !== "failed")
    .reduce((sum, refund) => sum + refund.amount, 0);
  return { payment, refundable: Math.max(0, payment.amount - committed) };
}

export async function refundOrderPayment(input: {
  orderId: string;
  amount: number;
  reason: string;
  requestedById: string;
}): Promise<void> {
  const db = getDb();
  const prepared = await db.$transaction(async (tx) => {
    await lockOrder(tx, input.orderId);
    const payment = await tx.payment.findFirst({
      where: { orderId: input.orderId, status: { in: [...refundedStatuses] }, needsReview: false },
      include: { refunds: true },
    });
    if (!payment) {
      throw new StoreError("conflict", "This order has no paid payment to refund.");
    }
    const committed = payment.refunds
      .filter((refund) => refund.status !== "failed")
      .reduce((sum, refund) => sum + refund.amount, 0);
    const refundable = payment.amount - committed;
    if (input.amount > refundable) {
      throw new StoreError(
        "conflict",
        refundable === 0
          ? "This payment has been refunded in full."
          : `You can refund at most Rp ${refundable.toLocaleString("id-ID")}.`,
      );
    }
    const refund = await tx.refund.create({
      data: {
        paymentId: payment.id,
        amount: input.amount,
        reason: input.reason,
        requestedById: input.requestedById,
        gatewayRefundKey: `${payment.gatewayReference}-r${randomBytes(6).toString("hex")}`,
      },
    });
    return { refund, payment };
  });

  try {
    await getPaymentGateway().refund({
      reference: prepared.payment.gatewayReference,
      amount: prepared.refund.amount,
      refundKey: prepared.refund.gatewayRefundKey,
      reason: prepared.refund.reason,
    });
  } catch (error) {
    if (!(error instanceof GatewayError)) {
      throw error;
    }
    await db.refund.update({
      where: { id: prepared.refund.id },
      data: { status: "failed", failureReason: error.message },
    });
    throw new StoreError(
      "gateway_error",
      `The payment gateway refused the refund: ${error.message}`,
    );
  }

  await db.$transaction(async (tx) => {
    await lockOrder(tx, input.orderId);
    await tx.refund.update({ where: { id: prepared.refund.id }, data: { status: "succeeded" } });
    const succeeded = await tx.refund.aggregate({
      where: { paymentId: prepared.payment.id, status: "succeeded" },
      _sum: { amount: true },
    });
    const fullyRefunded = (succeeded._sum.amount ?? 0) >= prepared.payment.amount;
    await tx.payment.update({
      where: { id: prepared.payment.id },
      data: { status: fullyRefunded ? "refunded" : "partially_refunded" },
    });
    if (fullyRefunded) {
      await tx.order.update({ where: { id: input.orderId }, data: { status: "refunded" } });
    }
  });
}

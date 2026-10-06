import "server-only";
import { getDb, type Transaction } from "../db";
import { releaseReservation } from "../stock";

export async function releaseOrderReservation(tx: Transaction, orderId: string): Promise<void> {
  const lines = await tx.orderLine.findMany({
    where: { orderId },
    select: { variantId: true, quantity: true },
  });
  await releaseReservation(tx, lines);
}

export async function lockOrder(
  tx: Transaction,
  orderId: string,
): Promise<{ status: string; payBy: Date; total: number } | undefined> {
  const [order] = await tx.$queryRaw<{ status: string; pay_by: Date; total: number }[]>`
    SELECT "status", "pay_by", "total" FROM "order" WHERE "id" = ${orderId}::uuid FOR UPDATE
  `;
  return order ? { status: order.status, payBy: order.pay_by, total: order.total } : undefined;
}

export async function cancelUnpaidOrder(orderId: string, now: Date = new Date()): Promise<boolean> {
  return getDb().$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (order?.status !== "awaiting_payment") {
      return false;
    }
    const openPayments = await tx.payment.count({ where: { orderId, status: "pending" } });
    if (openPayments > 0) {
      return false;
    }
    await releaseOrderReservation(tx, orderId);
    await tx.order.update({
      where: { id: orderId },
      data: { status: "cancelled", cancelledAt: now },
    });
    return true;
  });
}

export async function findCustomerOrderId(
  customerId: string,
  orderNumber: string,
): Promise<string | null> {
  const order = await getDb().order.findFirst({
    where: { orderNumber, customerId },
    select: { id: true },
  });
  return order?.id ?? null;
}

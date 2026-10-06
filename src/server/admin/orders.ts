import "server-only";
import type { AdminOrderDetail, AdminOrderFilter, AdminOrderSummary } from "@/contracts/admin";
import { getDb } from "../db";
import { recordOrderShipped } from "../email";
import { StoreError, notFound } from "../errors";
import { lockOrder, releaseOrderReservation } from "../orders/settle";
import { orderInclude, toOrderDetail } from "../orders/views";
import { findRefundablePayment, refundOrderPayment, settleOrder } from "../payments";
import { maskEmail, maskName, maskPhone, maskText, shouldMask, type Viewer } from "./masking";

async function requireOrderId(orderNumber: string): Promise<string> {
  const order = await getDb().order.findUnique({ where: { orderNumber }, select: { id: true } });
  if (!order) {
    throw notFound("Order not found");
  }
  return order.id;
}

function statusFilter(filter: AdminOrderFilter) {
  if (filter === "all") {
    return {};
  }
  if (filter === "to_ship") {
    return { status: "paid" as const };
  }
  return { status: filter };
}

export async function listAdminOrders(
  viewer: Viewer,
  options: { status: AdminOrderFilter; q?: string },
): Promise<AdminOrderSummary[]> {
  const search = options.q?.trim();
  const orders = await getDb().order.findMany({
    where: {
      ...statusFilter(options.status),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: "insensitive" } },
              { customer: { email: { contains: search.toLowerCase() } } },
            ],
          }
        : {}),
    },
    include: {
      customer: { select: { name: true, email: true, isSeeded: true, role: true } },
      lines: { select: { quantity: true } },
      payments: { select: { needsReview: true } },
    },
    orderBy: options.status === "to_ship" ? { paidAt: "asc" } : { createdAt: "desc" },
    take: 200,
  });
  return orders.map((order) => {
    const masked = shouldMask(viewer, order.customer);
    return {
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      customerName: masked ? maskName(order.customer.name) : order.customer.name,
      customerEmail: masked ? maskEmail(order.customer.email) : order.customer.email,
      itemCount: order.lines.reduce((sum, line) => sum + line.quantity, 0),
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
      needsReview: order.payments.some((payment) => payment.needsReview),
    };
  });
}

export async function getAdminOrder(
  viewer: Viewer,
  orderNumber: string,
  now: Date = new Date(),
): Promise<AdminOrderDetail> {
  const orderId = await requireOrderId(orderNumber);
  await settleOrder(orderId, now);
  const order = await getDb().order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      ...orderInclude,
      customer: { select: { name: true, email: true, isSeeded: true, role: true } },
    },
  });
  const detail = toOrderDetail(order, now);
  const masked = shouldMask(viewer, order.customer);
  const refundable = await findRefundablePayment(orderId);
  return {
    ...detail,
    address: masked
      ? {
          recipientName: maskName(detail.address.recipientName),
          phone: maskPhone(detail.address.phone),
          street: maskText(detail.address.street),
          district: maskText(detail.address.district),
          city: detail.address.city,
          province: detail.address.province,
          postalCode: maskText(detail.address.postalCode),
        }
      : detail.address,
    customer: {
      name: masked ? maskName(order.customer.name) : order.customer.name,
      email: masked ? maskEmail(order.customer.email) : order.customer.email,
    },
    adminPayments: order.payments.map((payment) => ({
      reference: payment.gatewayReference,
      status: payment.status,
      amount: payment.amount,
      method: payment.method,
      createdAt: payment.createdAt.toISOString(),
      paidAt: payment.paidAt?.toISOString() ?? null,
      needsReview: payment.needsReview,
      reviewReason: payment.reviewReason,
    })),
    refundableAmount: refundable?.refundable ?? 0,
    canShip: order.status === "paid",
    canCancel: order.status === "awaiting_payment",
  };
}

export async function shipOrder(orderNumber: string, now: Date = new Date()): Promise<void> {
  const orderId = await requireOrderId(orderNumber);
  await getDb().$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: "paid" },
      data: { status: "shipped", shippedAt: now },
    });
    if (count === 0) {
      throw new StoreError("conflict", "Only a paid order can be marked shipped.");
    }
    await recordOrderShipped(tx, orderId);
  });
}

export async function cancelOrderByAdmin(
  orderNumber: string,
  now: Date = new Date(),
): Promise<void> {
  const orderId = await requireOrderId(orderNumber);
  await settleOrder(orderId, now);
  await getDb().$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (order?.status !== "awaiting_payment") {
      throw new StoreError("conflict", "Only an unpaid order can be cancelled.");
    }
    await tx.payment.updateMany({
      where: { orderId, status: "pending" },
      data: { status: "failed" },
    });
    await releaseOrderReservation(tx, orderId);
    await tx.order.update({
      where: { id: orderId },
      data: { status: "cancelled", cancelledAt: now },
    });
  });
}

export async function refundOrder(
  viewer: Viewer,
  orderNumber: string,
  amount: number,
  reason: string,
): Promise<void> {
  const orderId = await requireOrderId(orderNumber);
  await refundOrderPayment({ orderId, amount, reason, requestedById: viewer.id });
}

import "server-only";
import type { OrderDetail, OrderSummary, PaymentStatus } from "@/contracts/orders";

export const orderInclude = {
  lines: { orderBy: { createdAt: "asc" } },
  payments: {
    orderBy: { attempt: "asc" },
    include: { refunds: { orderBy: { createdAt: "asc" } } },
  },
} as const;

type RefundRow = { amount: number; reason: string; status: string; createdAt: Date };

type PaymentRow = {
  status: PaymentStatus;
  amount: number;
  method: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  paidAt: Date | null;
  refunds?: RefundRow[];
};

export type OrderWithRelations = {
  orderNumber: string;
  status: OrderDetail["status"];
  subtotal: number;
  shippingFee: number;
  total: number;
  recipientName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  payBy: Date;
  paidAt: Date | null;
  shippedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  lines: {
    productName: string;
    variantName: string;
    productSlug: string;
    image: string | null;
    unitPrice: number;
    quantity: number;
  }[];
  payments: PaymentRow[];
};

export const minimumMinutesToPay = 5;

export function hasOpenPayment(payments: PaymentRow[], now: Date): boolean {
  return payments.some(
    (payment) => payment.status === "pending" && (!payment.expiresAt || payment.expiresAt > now),
  );
}

export function orderCanBePaid(
  order: { status: string; payBy: Date; payments: PaymentRow[] },
  now: Date,
): boolean {
  return (
    order.status === "awaiting_payment" &&
    order.payBy.getTime() - now.getTime() > minimumMinutesToPay * 60 * 1000 &&
    !hasOpenPayment(order.payments, now)
  );
}

export function toOrderDetail(order: OrderWithRelations, now: Date = new Date()): OrderDetail {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    payBy: order.payBy.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    shippedAt: order.shippedAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    address: {
      recipientName: order.recipientName,
      phone: order.phone,
      street: order.street,
      district: order.district,
      city: order.city,
      province: order.province,
      postalCode: order.postalCode,
    },
    lines: order.lines.map((line) => ({
      productName: line.productName,
      variantName: line.variantName,
      productSlug: line.productSlug,
      image: line.image,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      lineTotal: line.unitPrice * line.quantity,
    })),
    payments: order.payments.map((payment) => ({
      status: payment.status,
      amount: payment.amount,
      method: payment.method,
      createdAt: payment.createdAt.toISOString(),
      expiresAt: payment.expiresAt?.toISOString() ?? null,
      paidAt: payment.paidAt?.toISOString() ?? null,
    })),
    refunds: order.payments
      .flatMap((payment) => payment.refunds ?? [])
      .map((refund) => ({
        amount: refund.amount,
        reason: refund.reason,
        status: refund.status as "pending" | "succeeded" | "failed",
        createdAt: refund.createdAt.toISOString(),
      })),
    canPay: orderCanBePaid(order, now),
  };
}

export function toOrderSummary(order: {
  orderNumber: string;
  status: OrderSummary["status"];
  total: number;
  createdAt: Date;
  lines: { quantity: number }[];
}): OrderSummary {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total,
    itemCount: order.lines.reduce((sum, line) => sum + line.quantity, 0),
    createdAt: order.createdAt.toISOString(),
  };
}

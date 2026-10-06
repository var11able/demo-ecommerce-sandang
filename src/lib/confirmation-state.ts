import type { PaymentStatusResponse } from "@/contracts/payments";

const confirmingWindowMs = 3 * 60 * 1000;

export type ConfirmationState =
  "confirming" | "paid" | "awaiting" | "not_started" | "failed" | "expired" | "cancelled";

export function confirmationState(status: PaymentStatusResponse): ConfirmationState {
  const now = Date.parse(status.checkedAt);
  if (["paid", "shipped", "completed", "refunded"].includes(status.orderStatus)) {
    return "paid";
  }
  if (status.orderStatus === "cancelled") {
    return "cancelled";
  }
  const payment = status.payment;
  if (!payment) {
    return "not_started";
  }
  if (payment.status === "failed") {
    return "failed";
  }
  if (payment.status === "expired") {
    return "expired";
  }
  if (payment.status === "pending") {
    const recent = now - new Date(payment.createdAt).getTime() < confirmingWindowMs;
    return payment.method || !recent ? "awaiting" : "confirming";
  }
  return "paid";
}

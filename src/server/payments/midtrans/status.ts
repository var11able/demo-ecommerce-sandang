import "server-only";
import type { PaymentStatus } from "@/contracts/orders";

export function translateMidtransStatus(
  transactionStatus: string,
  fraudStatus: string | undefined,
): PaymentStatus {
  switch (transactionStatus) {
    case "settlement":
      return "paid";
    case "capture":
      return fraudStatus === "accept" ? "paid" : "pending";
    case "pending":
      return "pending";
    case "deny":
    case "cancel":
    case "failure":
      return "failed";
    case "expire":
      return "expired";
    case "refund":
      return "refunded";
    case "partial_refund":
      return "partially_refunded";
    default:
      return "pending";
  }
}

export function parseGrossAmount(grossAmount: string): number {
  const match = /^(\d+)(?:\.00)?$/.exec(grossAmount);
  return match?.[1] ? Number(match[1]) : Number.NaN;
}

import type { paymentStatusResponseSchema, startPaymentResponseSchema } from "@/contracts/payments";
import { callApi } from "./api-client";

export async function requestPayment(orderNumber: string) {
  return callApi<typeof startPaymentResponseSchema>(`/orders/${orderNumber}/payments`, {
    method: "POST",
  });
}

export async function fetchPaymentStatus(orderNumber: string, signal?: AbortSignal) {
  return callApi<typeof paymentStatusResponseSchema>(`/orders/${orderNumber}/payment-status`, {
    signal,
  });
}

export function confirmationPath(orderNumber: string): string {
  return `/orders/${orderNumber}/confirmation`;
}

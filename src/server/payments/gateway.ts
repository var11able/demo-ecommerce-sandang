import "server-only";
import type { PaymentStatus } from "@/contracts/orders";

export type PaymentUpdate = {
  reference: string;
  status: PaymentStatus;
  amount: number;
  method?: string;
};

export type CreatePaymentInput = {
  reference: string;
  amount: number;
  customer: { name: string; email: string };
  lines: { id: string; name: string; unitPrice: number; quantity: number }[];
  expiryMinutes: number;
  finishUrl?: string;
};

export type CreatedPayment = { token: string; redirectUrl: string; expiresAt: Date };

export type RefundInput = { reference: string; amount: number; refundKey: string; reason: string };

export interface PaymentGateway {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>;
  parseNotification(rawBody: unknown): PaymentUpdate | null;
  fetchStatus(reference: string): Promise<PaymentUpdate | null>;
  refund(input: RefundInput): Promise<void>;
}

export class GatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GatewayError";
  }
}

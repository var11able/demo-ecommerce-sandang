import "server-only";
import { createHash } from "node:crypto";
import type { PaymentStatus } from "@/contracts/orders";
import {
  GatewayError,
  type CreatePaymentInput,
  type CreatedPayment,
  type PaymentGateway,
  type PaymentUpdate,
  type RefundInput,
} from "../gateway";

const fakeSecret = "fake-gateway-secret";

type FakeTransaction = {
  reference: string;
  amount: number;
  status: PaymentStatus | "untouched";
  method?: string;
  refunds: RefundInput[];
};

export type FakeNotification = {
  reference: string;
  status: PaymentStatus;
  amount: string;
  method?: string;
  signature: string;
};

function sign(reference: string, status: string, amount: string): string {
  return createHash("sha256")
    .update(`${reference}|${status}|${amount}|${fakeSecret}`)
    .digest("hex");
}

export class FakePaymentGateway implements PaymentGateway {
  readonly name = "fake";
  readonly transactions = new Map<string, FakeTransaction>();
  readonly created: CreatePaymentInput[] = [];
  failNextCreate = false;
  failStatusChecks = false;
  refuseRefunds: string | null = null;

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    if (this.failNextCreate) {
      this.failNextCreate = false;
      throw new GatewayError("The fake gateway refused to create a payment");
    }
    this.created.push(input);
    this.transactions.set(input.reference, {
      reference: input.reference,
      amount: input.amount,
      status: "untouched",
      refunds: [],
    });
    return {
      token: `fake-token-${input.reference}`,
      redirectUrl: `https://fake-gateway.test/pay/${input.reference}`,
      expiresAt: new Date(Date.now() + input.expiryMinutes * 60 * 1000),
    };
  }

  parseNotification(rawBody: unknown): PaymentUpdate | null {
    const body = rawBody as Partial<FakeNotification> | null;
    if (
      !body ||
      typeof body.reference !== "string" ||
      typeof body.status !== "string" ||
      typeof body.amount !== "string" ||
      body.signature !== sign(body.reference, body.status, body.amount)
    ) {
      return null;
    }
    return {
      reference: body.reference,
      status: body.status,
      amount: Number(body.amount),
      ...(body.method ? { method: body.method } : {}),
    };
  }

  async fetchStatus(reference: string): Promise<PaymentUpdate | null> {
    if (this.failStatusChecks) {
      throw new GatewayError("The fake gateway is unreachable");
    }
    const transaction = this.transactions.get(reference);
    if (!transaction || transaction.status === "untouched") {
      return null;
    }
    return {
      reference,
      status: transaction.status,
      amount: transaction.amount,
      ...(transaction.method ? { method: transaction.method } : {}),
    };
  }

  async refund(input: RefundInput): Promise<void> {
    if (this.refuseRefunds) {
      throw new GatewayError(this.refuseRefunds);
    }
    const transaction = this.transactions.get(input.reference);
    if (!transaction) {
      throw new GatewayError("Transaction not found");
    }
    if (transaction.refunds.some((refund) => refund.refundKey === input.refundKey)) {
      return;
    }
    transaction.refunds.push(input);
    const refunded = transaction.refunds.reduce((sum, refund) => sum + refund.amount, 0);
    transaction.status = refunded >= transaction.amount ? "refunded" : "partially_refunded";
  }

  setStatus(reference: string, status: PaymentStatus, method = "bank_transfer"): void {
    const transaction = this.transactions.get(reference);
    if (!transaction) {
      throw new Error(`No fake transaction ${reference}`);
    }
    transaction.status = status;
    transaction.method = method;
  }

  notification(
    reference: string,
    status: PaymentStatus,
    options: { amount?: number; method?: string } = {},
  ): FakeNotification {
    const amount = String(options.amount ?? this.transactions.get(reference)?.amount ?? 0);
    return {
      reference,
      status,
      amount,
      method: options.method ?? "bank_transfer",
      signature: sign(reference, status, amount),
    };
  }
}

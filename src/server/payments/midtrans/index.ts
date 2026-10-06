import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { readEnvironment } from "../../env";
import {
  GatewayError,
  type CreatePaymentInput,
  type CreatedPayment,
  type PaymentGateway,
  type PaymentUpdate,
  type RefundInput,
} from "../gateway";
import { parseGrossAmount, translateMidtransStatus } from "./status";

const sandboxHosts = {
  snap: "https://app.sandbox.midtrans.com",
  api: "https://api.sandbox.midtrans.com",
};
const productionHosts = { snap: "https://app.midtrans.com", api: "https://api.midtrans.com" };
const requestTimeoutMs = 10_000;
const maxItemNameLength = 50;

const statusBodySchema = z.looseObject({
  order_id: z.string(),
  status_code: z.string(),
  gross_amount: z.string(),
  transaction_status: z.string(),
  fraud_status: z.string().optional(),
  payment_type: z.string().optional(),
});

const notificationBodySchema = statusBodySchema.extend({ signature_key: z.string() });

const snapResponseSchema = z.looseObject({ token: z.string(), redirect_url: z.string() });
const apiStatusSchema = z.looseObject({
  status_code: z.string(),
  status_message: z.string().optional(),
});

export type MidtransConfig = { serverKey: string; isProduction: boolean };

export function midtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
): string {
  return createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
}

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received.toLowerCase(), "utf8");
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function toUpdate(body: z.infer<typeof statusBodySchema>): PaymentUpdate {
  return {
    reference: body.order_id,
    status: translateMidtransStatus(body.transaction_status, body.fraud_status),
    amount: parseGrossAmount(body.gross_amount),
    ...(body.payment_type ? { method: body.payment_type } : {}),
  };
}

export class MidtransGateway implements PaymentGateway {
  readonly name = "midtrans";
  private readonly config: MidtransConfig;
  private readonly hosts: typeof sandboxHosts;

  constructor(config: MidtransConfig) {
    this.config = config;
    this.hosts = config.isProduction ? productionHosts : sandboxHosts;
  }

  private async request(url: string, init: { method: string; body?: unknown }): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: init.method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${this.config.serverKey}:`).toString("base64")}`,
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch {
      throw new GatewayError("Midtrans could not be reached");
    }
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const messages = z
        .looseObject({ error_messages: z.array(z.string()).optional() })
        .safeParse(body);
      throw new GatewayError(
        messages.success && messages.data.error_messages?.length
          ? messages.data.error_messages.join("; ")
          : `Midtrans answered ${response.status}`,
      );
    }
    return body;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    const body = await this.request(`${this.hosts.snap}/snap/v1/transactions`, {
      method: "POST",
      body: {
        transaction_details: { order_id: input.reference, gross_amount: input.amount },
        item_details: input.lines.map((line) => ({
          id: line.id.slice(0, 50),
          name: line.name.slice(0, maxItemNameLength),
          price: line.unitPrice,
          quantity: line.quantity,
        })),
        customer_details: { first_name: input.customer.name, email: input.customer.email },
        expiry: { unit: "minute", duration: input.expiryMinutes },
        ...(input.finishUrl ? { callbacks: { finish: input.finishUrl } } : {}),
      },
    });
    const parsed = snapResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new GatewayError("Midtrans returned an unexpected response");
    }
    return {
      token: parsed.data.token,
      redirectUrl: parsed.data.redirect_url,
      expiresAt: new Date(Date.now() + input.expiryMinutes * 60 * 1000),
    };
  }

  parseNotification(rawBody: unknown): PaymentUpdate | null {
    const parsed = notificationBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return null;
    }
    const { order_id, status_code, gross_amount, signature_key } = parsed.data;
    const expected = midtransSignature(order_id, status_code, gross_amount, this.config.serverKey);
    if (!signaturesMatch(expected, signature_key)) {
      return null;
    }
    return toUpdate(parsed.data);
  }

  async fetchStatus(reference: string): Promise<PaymentUpdate | null> {
    const body = await this.request(
      `${this.hosts.api}/v2/${encodeURIComponent(reference)}/status`,
      { method: "GET" },
    );
    const status = apiStatusSchema.safeParse(body);
    if (status.success && status.data.status_code === "404") {
      return null;
    }
    const parsed = statusBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new GatewayError("Midtrans returned an unexpected status response");
    }
    return toUpdate(parsed.data);
  }

  async refund(input: RefundInput): Promise<void> {
    const body = await this.request(
      `${this.hosts.api}/v2/${encodeURIComponent(input.reference)}/refund`,
      {
        method: "POST",
        body: { refund_key: input.refundKey, amount: input.amount, reason: input.reason },
      },
    );
    const status = apiStatusSchema.safeParse(body);
    if (!status.success || status.data.status_code !== "200") {
      throw new GatewayError(
        status.success && status.data.status_message
          ? status.data.status_message
          : "Midtrans refused the refund",
      );
    }
  }
}

export function createMidtransGateway(): MidtransGateway {
  const environment = readEnvironment();
  return new MidtransGateway({
    serverKey: environment.MIDTRANS_SERVER_KEY,
    isProduction: environment.MIDTRANS_IS_PRODUCTION,
  });
}

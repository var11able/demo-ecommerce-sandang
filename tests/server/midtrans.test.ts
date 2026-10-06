import { afterEach, describe, expect, it, vi } from "vitest";
import { MidtransGateway, midtransSignature } from "@/server/payments/midtrans";
import { parseGrossAmount, translateMidtransStatus } from "@/server/payments/midtrans/status";

const serverKey = "SB-Mid-server-recorded-test-key";
const gateway = new MidtransGateway({ serverKey, isProduction: false });

function recordedNotification(overrides: Record<string, string> = {}) {
  const body: Record<string, string> = {
    transaction_time: "2026-10-05 22:57:51",
    transaction_status: "settlement",
    transaction_id: "f6d988c9-639e-46ed-b502-2f17885407d0",
    status_message: "midtrans payment notification",
    status_code: "200",
    settlement_time: "2026-10-05 23:01:12",
    payment_type: "bank_transfer",
    order_id: "SDG-20261005-0042-1",
    merchant_id: "G000000000",
    gross_amount: "150000.00",
    fraud_status: "accept",
    currency: "IDR",
    ...overrides,
  };
  body.signature_key ??= midtransSignature(
    body.order_id!,
    body.status_code!,
    body.gross_amount!,
    serverKey,
  );
  return body;
}

describe("Midtrans status translation", () => {
  it.each([
    ["settlement", undefined, "paid"],
    ["capture", "accept", "paid"],
    ["capture", "challenge", "pending"],
    ["pending", undefined, "pending"],
    ["deny", undefined, "failed"],
    ["cancel", undefined, "failed"],
    ["failure", undefined, "failed"],
    ["expire", undefined, "expired"],
    ["refund", undefined, "refunded"],
    ["partial_refund", undefined, "partially_refunded"],
  ] as const)("%s with fraud status %s becomes %s", (transaction, fraud, expected) => {
    expect(translateMidtransStatus(transaction, fraud)).toBe(expected);
  });

  it("reads gross_amount as whole rupiah and rejects anything else", () => {
    expect(parseGrossAmount("150000.00")).toBe(150000);
    expect(parseGrossAmount("150000")).toBe(150000);
    expect(parseGrossAmount("150000.50")).toBeNaN();
    expect(parseGrossAmount("1e5")).toBeNaN();
  });
});

describe("Midtrans Notification signature", () => {
  it("accepts a correctly signed Notification and translates it", () => {
    expect(gateway.parseNotification(recordedNotification())).toEqual({
      reference: "SDG-20261005-0042-1",
      status: "paid",
      amount: 150000,
      method: "bank_transfer",
    });
  });

  it("checks the signature over gross_amount exactly as received", () => {
    const signedWithoutDecimals = recordedNotification({
      signature_key: midtransSignature("SDG-20261005-0042-1", "200", "150000", serverKey),
    });
    expect(gateway.parseNotification(signedWithoutDecimals)).toBeNull();
  });

  it("refuses a Notification whose amount was changed after signing", () => {
    const original = recordedNotification();
    expect(gateway.parseNotification({ ...original, gross_amount: "1000.00" })).toBeNull();
  });

  it("refuses a Notification signed with another key", () => {
    const body = recordedNotification({
      signature_key: midtransSignature("SDG-20261005-0042-1", "200", "150000.00", "other-key"),
    });
    expect(gateway.parseNotification(body)).toBeNull();
  });

  it("refuses a body with missing fields", () => {
    expect(gateway.parseNotification({ order_id: "x" })).toBeNull();
    expect(gateway.parseNotification(null)).toBeNull();
  });
});

describe("Midtrans API calls", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates a Snap transaction with Basic auth and line items that add up", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { token: "snap-token", redirect_url: "https://app.sandbox.midtrans.com/x" },
          { status: 201 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const created = await gateway.createPayment({
      reference: "SDG-20261005-0042-1",
      amount: 216000,
      customer: { name: "Sari", email: "sari@example.com" },
      lines: [
        { id: "v1", name: "Boxy Tee, M", unitPrice: 98000, quantity: 2 },
        { id: "shipping", name: "Shipping fee", unitPrice: 20000, quantity: 1 },
      ],
      expiryMinutes: 60,
    });

    expect(created.token).toBe("snap-token");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://app.sandbox.midtrans.com/snap/v1/transactions");
    expect(init.headers.Authorization).toBe(
      `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
    );
    const sent = JSON.parse(init.body);
    expect(sent.transaction_details).toEqual({
      order_id: "SDG-20261005-0042-1",
      gross_amount: 216000,
    });
    expect(sent.expiry).toEqual({ unit: "minute", duration: 60 });
    expect(
      sent.item_details.reduce(
        (sum: number, item: { price: number; quantity: number }) =>
          sum + item.price * item.quantity,
        0,
      ),
    ).toBe(216000);
  });

  it("reads a status check, and treats Midtrans's in-body 404 as no transaction yet", async () => {
    const recordedPending = {
      status_code: "201",
      transaction_id: "f6d988c9-639e-46ed-b502-2f17885407d0",
      gross_amount: "150000.00",
      currency: "IDR",
      order_id: "SDG-20261005-0042-1",
      payment_type: "bank_transfer",
      transaction_status: "pending",
      fraud_status: "accept",
      status_message: "Success, transaction is found",
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json(recordedPending))
        .mockResolvedValueOnce(
          Response.json({ status_code: "404", status_message: "Transaction doesn't exist." }),
        ),
    );
    expect(await gateway.fetchStatus("SDG-20261005-0042-1")).toEqual({
      reference: "SDG-20261005-0042-1",
      status: "pending",
      amount: 150000,
      method: "bank_transfer",
    });
    expect(await gateway.fetchStatus("SDG-20261005-0042-2")).toBeNull();
  });

  it("turns a refused refund into a gateway error with Midtrans's reason", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          status_code: "412",
          status_message: "Merchant cannot modify the status",
        }),
      ),
    );
    await expect(
      gateway.refund({ reference: "r", amount: 1000, refundKey: "k", reason: "test" }),
    ).rejects.toThrow("Merchant cannot modify the status");
  });
});

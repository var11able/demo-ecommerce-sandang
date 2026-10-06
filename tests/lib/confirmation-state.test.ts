import { describe, expect, it } from "vitest";
import type { PaymentStatusResponse } from "@/contracts/payments";
import { confirmationState } from "@/lib/confirmation-state";

const checkedAt = "2026-10-05T10:00:00.000Z";

function status(
  overrides: Omit<Partial<PaymentStatusResponse>, "payment"> & {
    payment?: Partial<NonNullable<PaymentStatusResponse["payment"]>> | null;
  } = {},
): PaymentStatusResponse {
  const { payment, ...rest } = overrides;
  return {
    orderNumber: "SDG-20261005-0001",
    orderStatus: "awaiting_payment",
    canPay: false,
    payBy: "2026-10-06T10:00:00.000Z",
    checkedAt,
    payment:
      payment === null
        ? null
        : {
            status: "pending",
            method: null,
            amount: 100000,
            createdAt: "2026-10-05T09:59:00.000Z",
            expiresAt: "2026-10-05T10:59:00.000Z",
            token: "token",
            ...payment,
          },
    ...rest,
  };
}

describe("what the confirmation page says", () => {
  it("says it is checking right after the window closes, before a method is known", () => {
    expect(confirmationState(status())).toBe("confirming");
  });

  it("says it is waiting once a method like bank transfer was chosen", () => {
    expect(confirmationState(status({ payment: { method: "bank_transfer" } }))).toBe("awaiting");
  });

  it("stops saying it is checking after a few minutes with no method", () => {
    expect(confirmationState(status({ payment: { createdAt: "2026-10-05T09:50:00.000Z" } }))).toBe(
      "awaiting",
    );
  });

  it("says paid when the server reports the Order or its Payment as paid", () => {
    expect(confirmationState(status({ orderStatus: "paid", payment: { status: "paid" } }))).toBe(
      "paid",
    );
    expect(confirmationState(status({ payment: { status: "paid" } }))).toBe("paid");
  });

  it("says what happened when the Payment failed or expired", () => {
    expect(confirmationState(status({ canPay: true, payment: { status: "failed" } }))).toBe(
      "failed",
    );
    expect(confirmationState(status({ canPay: true, payment: { status: "expired" } }))).toBe(
      "expired",
    );
  });

  it("says the Order was cancelled once it can no longer be paid", () => {
    expect(
      confirmationState(status({ orderStatus: "cancelled", payment: { status: "expired" } })),
    ).toBe("cancelled");
  });

  it("offers to start paying when no Payment exists yet", () => {
    expect(confirmationState(status({ canPay: true, payment: null }))).toBe("not_started");
  });
});

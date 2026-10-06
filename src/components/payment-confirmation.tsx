"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PaymentStatusResponse } from "@/contracts/payments";
import { copy } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { fetchPaymentStatus } from "@/lib/payment-client";
import { confirmationState, type ConfirmationState } from "@/lib/confirmation-state";
import type { SnapConfig } from "@/lib/snap";
import { durations } from "@/lib/motion-presets";
import { Swap } from "./motion/swap";
import { usePayment } from "./pay-button";
import { Button, ButtonLink } from "./ui/button";
import { Notice, type NoticeTone } from "./ui/notice";

const fastPollMs = 3000;
const slowPollMs = 10000;
const fastPolls = 20;

const isFinal = (state: ConfirmationState) =>
  state === "paid" || state === "cancelled" || state === "failed" || state === "expired";

const tones: Record<ConfirmationState, NoticeTone> = {
  confirming: "info",
  paid: "success",
  awaiting: "waiting",
  not_started: "waiting",
  failed: "problem",
  expired: "problem",
  cancelled: "problem",
};

export function PaymentConfirmation({
  initial,
  snap,
}: {
  initial: PaymentStatusResponse;
  snap: SnapConfig;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [polls, setPolls] = useState(0);
  const state = confirmationState(status);
  const { pay, pending, message } = usePayment(status.orderNumber, snap);

  useEffect(() => {
    if (isFinal(state)) {
      return;
    }
    const controller = new AbortController();
    const delay = polls > fastPolls ? slowPollMs : fastPollMs;
    const timer = window.setTimeout(async () => {
      const result = await fetchPaymentStatus(status.orderNumber, controller.signal);
      setPolls((count) => count + 1);
      if (result.ok && result.data) {
        const next = result.data;
        setStatus(next);
        if (isFinal(confirmationState(next))) {
          router.refresh();
        }
      }
    }, delay);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [state, status, polls, router]);

  const payment = status.payment;
  const view = {
    confirming: { title: copy.confirmation.checkingTitle, body: copy.confirmation.checkingBody },
    paid: {
      title: copy.confirmation.paidTitle,
      body: copy.confirmation.paidBody(status.orderNumber),
    },
    awaiting: {
      title: copy.confirmation.waitingTitle,
      body: copy.confirmation.waitingBody(formatDateTime(payment?.expiresAt ?? status.payBy)),
    },
    not_started: {
      title: copy.confirmation.notStartedTitle,
      body: copy.confirmation.notStartedBody,
    },
    failed: { title: copy.confirmation.failedTitle, body: copy.confirmation.failedBody },
    expired: { title: copy.confirmation.expiredTitle, body: copy.confirmation.expiredBody },
    cancelled: { title: copy.confirmation.cancelledTitle, body: copy.confirmation.cancelledBody },
  }[state];

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <Swap swapKey={state} duration={durations.statusChange}>
        <Notice tone={tones[state]} title={view.title} role="status">
          <p>{view.body}</p>
          {state === "awaiting" && polls > fastPolls && (
            <p className="mt-2 text-caption text-muted">{copy.confirmation.stillChecking}</p>
          )}
        </Notice>
      </Swap>
      <div className="flex flex-col gap-3 sm:flex-row">
        {(state === "awaiting" || state === "confirming") && payment?.token && (
          <Button variant="primary" onClick={() => pay(payment.token)} disabled={pending}>
            {pending ? copy.order.starting : copy.confirmation.showInstructions}
          </Button>
        )}
        {(state === "failed" || state === "expired" || state === "not_started") &&
          status.canPay && (
            <Button variant="primary" onClick={() => pay()} disabled={pending}>
              {pending
                ? copy.order.starting
                : state === "not_started"
                  ? copy.order.payNow
                  : copy.order.payAgain}
            </Button>
          )}
        <ButtonLink href={`/orders/${status.orderNumber}`} variant="secondary">
          {copy.confirmation.viewOrder}
        </ButtonLink>
        {(state === "paid" || state === "cancelled") && (
          <ButtonLink href="/search" variant="quiet">
            {copy.confirmation.keepShopping}
          </ButtonLink>
        )}
      </div>
      <p role="alert" className="text-caption text-danger empty:hidden">
        {message}
      </p>
    </div>
  );
}

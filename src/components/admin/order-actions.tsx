"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { adminOrderResponseSchema } from "@/contracts/admin";
import { callApi } from "@/lib/api-client";
import { copy } from "@/lib/copy";
import { formatRupiah } from "@/lib/format";
import { Button } from "../ui/button";
import { Notice } from "../ui/notice";
import { TextField } from "../ui/text-field";

type Pending = "ship" | "cancel" | "refund" | null;

export function AdminOrderActions({
  orderNumber,
  canShip,
  canCancel,
  refundableAmount,
}: {
  orderNumber: string;
  canShip: boolean;
  canCancel: boolean;
  refundableAmount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const [message, setMessage] = useState<{ tone: "success" | "problem"; text: string } | null>(
    null,
  );

  async function run(action: Exclude<Pending, null>, path: string, body?: unknown) {
    setPending(action);
    setMessage(null);
    const result = await callApi<typeof adminOrderResponseSchema>(
      `/admin/orders/${orderNumber}${path}`,
      {
        method: "POST",
        body,
      },
    );
    setPending(null);
    if (result.ok) {
      if (action === "refund") {
        setMessage({ tone: "success", text: copy.admin.refundDone });
      }
      router.refresh();
    } else {
      setMessage({ tone: "problem", text: result.message });
      router.refresh();
    }
  }

  async function handleRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run("refund", "/refunds", {
      amount: Number(form.get("amount")),
      reason: String(form.get("reason") ?? ""),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {message && <Notice tone={message.tone} role="status" title={message.text} />}
      <div className="flex flex-wrap gap-3">
        {canShip && (
          <Button
            variant="primary"
            onClick={() => run("ship", "/ship")}
            disabled={pending !== null}
          >
            {pending === "ship" ? copy.admin.marking : copy.admin.markShipped}
          </Button>
        )}
        {canCancel && (
          <Button
            onClick={() => {
              if (window.confirm(copy.admin.confirmCancel)) {
                void run("cancel", "/cancel");
              }
            }}
            disabled={pending !== null}
          >
            {pending === "cancel" ? copy.admin.cancelling : copy.admin.cancelOrder}
          </Button>
        )}
      </div>
      {refundableAmount > 0 && (
        <form
          onSubmit={handleRefund}
          className="flex flex-col gap-3 border border-ink bg-surface p-5"
        >
          <h2 className="text-heading-sm">{copy.admin.refundTitle}</h2>
          <p className="text-caption text-muted">
            {copy.admin.refundable(formatRupiah(refundableAmount))}
          </p>
          <TextField
            id="refund-amount"
            name="amount"
            type="number"
            min={1}
            max={refundableAmount}
            step={1}
            defaultValue={refundableAmount}
            label={copy.admin.refundAmount}
            required
          />
          <TextField
            id="refund-reason"
            name="reason"
            label={copy.admin.refundReason}
            minLength={3}
            maxLength={200}
            required
          />
          <Button type="submit" variant="primary" disabled={pending !== null}>
            {pending === "refund" ? copy.admin.refunding : copy.admin.refund}
          </Button>
        </form>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { copy } from "@/lib/copy";
import { confirmationPath, requestPayment } from "@/lib/payment-client";
import { openSnap, type SnapConfig } from "@/lib/snap";
import { Button, type ButtonVariant } from "./ui/button";

export function usePayment(orderNumber: string, snap: SnapConfig) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const finished = () => {
    router.push(confirmationPath(orderNumber));
    router.refresh();
  };

  async function pay(existingToken?: string | null) {
    setPending(true);
    setMessage(null);
    if (existingToken) {
      await openSnap(snap, { token: existingToken }, finished);
      setPending(false);
      return;
    }
    const result = await requestPayment(orderNumber);
    if (result.ok && result.data) {
      await openSnap(snap, result.data.payment, finished);
      setPending(false);
      return;
    }
    setPending(false);
    if (!result.ok && result.status === 401) {
      router.push(`/login?next=${encodeURIComponent(`/orders/${orderNumber}`)}`);
      return;
    }
    setMessage(result.ok ? null : result.message);
    router.refresh();
  }

  return { pay, pending, message };
}

export function PayButton({
  orderNumber,
  snap,
  label,
  existingToken,
  variant = "primary",
}: {
  orderNumber: string;
  snap: SnapConfig;
  label: string;
  existingToken?: string | null;
  variant?: ButtonVariant;
}) {
  const { pay, pending, message } = usePayment(orderNumber, snap);
  return (
    <div className="flex flex-col gap-2">
      <Button variant={variant} fullWidth onClick={() => pay(existingToken)} disabled={pending}>
        {pending ? copy.order.starting : label}
      </Button>
      <p role="status" className="text-caption text-danger empty:hidden">
        {message}
      </p>
    </div>
  );
}

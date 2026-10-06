"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { indonesianProvinces } from "@/contracts/constants";
import type { orderDetailResponseSchema } from "@/contracts/orders";
import { callApi } from "@/lib/api-client";
import { copy } from "@/lib/copy";
import { confirmationPath, requestPayment } from "@/lib/payment-client";
import { openSnap, type SnapConfig } from "@/lib/snap";
import { Button } from "./ui/button";
import { Notice } from "./ui/notice";
import { SelectField } from "./ui/select-field";
import { TextField } from "./ui/text-field";

const fieldNames = [
  "recipientName",
  "phone",
  "street",
  "district",
  "city",
  "province",
  "postalCode",
] as const;

type FieldName = (typeof fieldNames)[number];
type FieldErrors = Partial<Record<FieldName, string>>;

function fieldErrorsFrom(fields: Record<string, string> | undefined): FieldErrors {
  const errors: FieldErrors = {};
  for (const [path, message] of Object.entries(fields ?? {})) {
    const name = path.replace(/^address\./, "") as FieldName;
    if (fieldNames.includes(name)) {
      errors[name] = message;
    }
  }
  return errors;
}

export function CheckoutForm({
  review,
  demoNotice,
  snap,
}: {
  review: ReactNode;
  demoNotice: boolean;
  snap: SnapConfig;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const address = Object.fromEntries(
      fieldNames.map((name) => [name, String(form.get(name) ?? "")]),
    );
    setPending(true);
    setMessage(null);
    setErrors({});
    const result = await callApi<typeof orderDetailResponseSchema>("/orders", {
      method: "POST",
      body: { address },
    });
    if (result.ok && result.data) {
      const { orderNumber } = result.data.order;
      const payment = await requestPayment(orderNumber);
      if (payment.ok && payment.data) {
        await openSnap(snap, payment.data.payment, () =>
          router.push(confirmationPath(orderNumber)),
        );
      } else {
        router.push(`/orders/${orderNumber}`);
      }
      return;
    }
    setPending(false);
    if (!result.ok && result.status === 401) {
      router.push("/login?next=/checkout");
      return;
    }
    if (!result.ok) {
      const fieldErrors = fieldErrorsFrom(result.fields);
      setErrors(fieldErrors);
      setMessage(Object.keys(fieldErrors).length > 0 ? copy.checkout.fixFields : result.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-10 pb-24 sm:pb-0 lg:grid-cols-3">
      <section className="flex flex-col gap-5 lg:col-span-2" aria-labelledby="address-title">
        <h2 id="address-title" className="text-heading">
          {copy.checkout.addressTitle}
        </h2>
        <TextField
          id="recipientName"
          name="recipientName"
          label={copy.checkout.recipientName}
          autoComplete="name"
          maxLength={100}
          error={errors.recipientName}
          required
        />
        <TextField
          id="phone"
          name="phone"
          type="tel"
          label={copy.checkout.phone}
          hint={copy.checkout.phoneHint}
          autoComplete="tel"
          inputMode="tel"
          error={errors.phone}
          required
        />
        <TextField
          id="street"
          name="street"
          label={copy.checkout.street}
          hint={copy.checkout.streetHint}
          autoComplete="street-address"
          maxLength={200}
          error={errors.street}
          required
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="district"
            name="district"
            label={copy.checkout.district}
            maxLength={100}
            error={errors.district}
            required
          />
          <TextField
            id="city"
            name="city"
            label={copy.checkout.city}
            autoComplete="address-level2"
            maxLength={100}
            error={errors.city}
            required
          />
          <SelectField
            id="province"
            name="province"
            label={copy.checkout.province}
            placeholder={copy.checkout.provincePlaceholder}
            options={indonesianProvinces}
            autoComplete="address-level1"
            error={errors.province}
            required
          />
          <TextField
            id="postalCode"
            name="postalCode"
            label={copy.checkout.postalCode}
            autoComplete="postal-code"
            inputMode="numeric"
            maxLength={5}
            error={errors.postalCode}
            required
          />
        </div>
        {demoNotice && <p className="text-caption text-muted">{copy.auth.demoDetailsWarning}</p>}
      </section>
      <section className="flex flex-col gap-5" aria-labelledby="review-title">
        <h2 id="review-title" className="text-heading">
          {copy.checkout.reviewTitle}
        </h2>
        {review}
        {message && <Notice tone="problem" role="alert" title={message} />}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-page p-4 sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <Button type="submit" variant="primary" fullWidth disabled={pending}>
            {pending ? copy.checkout.placing : copy.checkout.placeOrder}
          </Button>
        </div>
      </section>
    </form>
  );
}

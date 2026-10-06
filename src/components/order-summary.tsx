import type { ReactNode } from "react";
import { copy } from "@/lib/copy";
import { Price } from "./ui/price";

export function OrderSummary({
  subtotal,
  shippingFee,
  total,
  lines,
  children,
}: {
  subtotal: number;
  shippingFee: number;
  total: number;
  lines?: { key: string; label: string; amount: number }[];
  children?: ReactNode;
}) {
  return (
    <section
      aria-labelledby="order-summary-title"
      className="flex flex-col gap-4 border border-ink bg-surface p-6"
    >
      <h2 id="order-summary-title" className="text-heading-sm">
        {copy.summary.title}
      </h2>
      <dl className="flex flex-col gap-3 text-body">
        {lines?.map((line) => (
          <div key={line.key} className="flex justify-between gap-4">
            <dt className="text-ink-soft">{line.label}</dt>
            <dd>
              <Price amount={line.amount} />
            </dd>
          </div>
        ))}
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">{copy.summary.subtotal}</dt>
          <dd>
            <Price amount={subtotal} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="flex flex-col text-ink-soft">
            {copy.summary.shippingFee}
            <span className="text-caption text-muted">{copy.summary.flatShipping}</span>
          </dt>
          <dd>
            <Price amount={shippingFee} />
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-line pt-3 text-body-lg">
          <dt>{copy.summary.total}</dt>
          <dd>
            <Price amount={total} />
          </dd>
        </div>
      </dl>
      {children}
    </section>
  );
}

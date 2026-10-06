"use client";

import { copy } from "@/lib/copy";

export function QuantityStepper({
  value,
  max,
  onChange,
  disabled = false,
  label = copy.product.quantityLabel,
  id,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
  id: string;
}) {
  const atLimit = value >= max;
  const limitId = `${id}-limit`;
  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        className="inline-flex min-h-11 w-fit items-center rounded-control border border-ink bg-surface"
      >
        <span id={`${id}-label`} className="sr-only">
          {label}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={disabled || value <= 1}
          aria-label={copy.product.decrease}
          className="size-11 rounded-control text-body-lg disabled:opacity-40"
        >
          −
        </button>
        <output aria-live="polite" className="tabular w-10 text-center text-body">
          {value}
        </output>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || atLimit}
          aria-label={copy.product.increase}
          aria-describedby={atLimit ? limitId : undefined}
          className="size-11 rounded-control text-body-lg disabled:opacity-40"
        >
          +
        </button>
      </div>
      {atLimit && max > 0 && (
        <p id={limitId} className="text-caption text-muted">
          {copy.product.stockLimit(max)}
        </p>
      )}
    </div>
  );
}

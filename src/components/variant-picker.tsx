"use client";

import Link from "next/link";
import type { ProductVariant } from "@/contracts/catalog";
import { copy } from "@/lib/copy";
import { cx } from "@/lib/cx";

export function VariantPicker({
  variants,
  selectedId,
  onSelect,
  guideHref,
}: {
  variants: ProductVariant[];
  selectedId: string;
  onSelect: (variantId: string) => void;
  guideHref?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">{copy.product.variantLabel}</legend>
      <div className="flex items-center justify-between gap-4">
        <p aria-hidden="true" className="text-caption text-muted">
          {copy.product.variantLabel}
        </p>
        {guideHref && (
          <Link
            href={guideHref}
            className="inline-flex min-h-11 items-center text-caption underline underline-offset-4"
          >
            {copy.product.sizeGuide}
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const selected = variant.id === selectedId;
          const soldOut = variant.available === 0;
          return (
            <label
              key={variant.id}
              className={cx(
                "inline-flex min-h-11 items-center gap-2 rounded-control border px-5 text-body",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                selected
                  ? "cursor-pointer border-ink bg-ink text-surface"
                  : soldOut
                    ? "cursor-not-allowed border-line text-muted line-through"
                    : "cursor-pointer border-ink text-ink hover:bg-fog",
              )}
            >
              <input
                type="radio"
                name="variant"
                value={variant.id}
                checked={selected}
                disabled={soldOut && !selected}
                onChange={() => onSelect(variant.id)}
                className="sr-only"
              />
              {variant.name}
              {soldOut && <span className="sr-only">, {copy.product.outOfStock}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ProductVariant } from "@/contracts/catalog";
import { addToCart } from "@/lib/cart-client";
import { copy } from "@/lib/copy";
import { durations } from "@/lib/motion-presets";
import { SwapText } from "./motion/swap";
import { QuantityStepper } from "./quantity-stepper";
import { VariantPicker } from "./variant-picker";
import { Button } from "./ui/button";
import { Price } from "./ui/price";

type AddState =
  | { state: "idle" }
  | { state: "adding" }
  | { state: "added" }
  | { state: "failed"; message: string };

function firstAvailable(variants: ProductVariant[]): ProductVariant | undefined {
  return variants.find((variant) => variant.available > 0) ?? variants[0];
}

export function ProductPurchase({
  variants,
  sizeGuideHref,
}: {
  variants: ProductVariant[];
  sizeGuideHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedId, setSelectedId] = useState(() => firstAvailable(variants)?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [add, setAdd] = useState<AddState>({ state: "idle" });
  const selected = variants.find((variant) => variant.id === selectedId);

  if (!selected) {
    return null;
  }

  const soldOut = selected.available === 0;

  function selectVariant(variantId: string) {
    setSelectedId(variantId);
    setQuantity(1);
    setAdd({ state: "idle" });
  }

  async function handleAdd() {
    if (!selected) {
      return;
    }
    setAdd({ state: "adding" });
    const result = await addToCart(selected.id, quantity);
    if (result.outcome === "updated") {
      setAdd({ state: "added" });
      router.refresh();
    } else if (result.outcome === "unauthenticated") {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
    } else {
      setAdd({ state: "failed", message: result.message });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-subheading">
        <SwapText swapKey={selected.id} duration={durations.quick}>
          <Price amount={selected.price} />
        </SwapText>
      </p>
      {variants.length > 1 && (
        <VariantPicker
          variants={variants}
          selectedId={selected.id}
          onSelect={selectVariant}
          guideHref={sizeGuideHref}
        />
      )}
      {soldOut ? (
        <p className="inline-flex min-h-11 w-fit items-center rounded-control border border-line px-6 text-body text-muted">
          {copy.product.outOfStock}
        </p>
      ) : (
        <>
          <QuantityStepper
            id="product-quantity"
            value={quantity}
            max={selected.available}
            onChange={(value) => {
              setQuantity(value);
              setAdd({ state: "idle" });
            }}
          />
          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-page p-4 sm:static sm:border-0 sm:bg-transparent sm:p-0">
            <Button
              variant="primary"
              fullWidth
              onClick={handleAdd}
              disabled={add.state === "adding"}
              className="sm:w-auto"
            >
              <SwapText swapKey={add.state} duration={durations.quick}>
                {add.state === "adding"
                  ? copy.product.adding
                  : add.state === "added"
                    ? copy.product.added
                    : copy.product.addToCart}
              </SwapText>
            </Button>
          </div>
          <p role="status" className="text-caption text-danger">
            {add.state === "failed" ? add.message : ""}
          </p>
        </>
      )}
    </div>
  );
}

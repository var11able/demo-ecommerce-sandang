"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Cart, CartLine } from "@/contracts/cart";
import { removeLine, setLineQuantity, type CartChange } from "@/lib/cart-client";
import { copy } from "@/lib/copy";
import { durations, leave } from "@/lib/motion-presets";
import { OrderSummary } from "./order-summary";
import { QuantityStepper } from "./quantity-stepper";
import { Button, ButtonLink } from "./ui/button";
import { Notice } from "./ui/notice";
import { Price } from "./ui/price";

function CartLineRow({
  line,
  busy,
  onQuantity,
  onRemove,
}: {
  line: CartLine;
  busy: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const tooMany = line.quantity > line.available;
  return (
    <div className="flex gap-4 border-b border-line py-6">
      <Link
        href={`/products/${line.productSlug}`}
        className="relative block size-24 shrink-0 overflow-hidden bg-fog sm:size-30"
      >
        {line.image && (
          <Image src={line.image} alt="" fill sizes="120px" className="object-cover" />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <Link
              href={`/products/${line.productSlug}`}
              className="text-heading-sm hover:underline hover:underline-offset-4"
            >
              {line.productName}
            </Link>
            <p className="text-caption text-muted">
              {line.variantName} · <Price amount={line.unitPrice} />
            </p>
          </div>
          <p className="text-body-lg">
            <Price amount={line.lineTotal} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <QuantityStepper
            id={`quantity-${line.variantId}`}
            value={line.quantity}
            max={Math.max(line.available, 1)}
            onChange={onQuantity}
            disabled={busy || line.available === 0}
          />
          <Button variant="quiet" onClick={onRemove} disabled={busy}>
            {copy.cart.remove}
            <span className="sr-only"> {line.productName}</span>
          </Button>
        </div>
        {tooMany && (
          <p className="text-caption text-danger">
            {line.available === 0
              ? "This is out of stock. Remove it to continue."
              : `Only ${line.available} left. Lower the quantity to continue.`}
          </p>
        )}
      </div>
    </div>
  );
}

export function CartView({ initialCart }: { initialCart: Cart }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [cart, setCart] = useState(initialCart);
  const [totals, setTotals] = useState(initialCart);
  const [busyLine, setBusyLine] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function apply(variantId: string, change: Promise<CartChange>) {
    setBusyLine(variantId);
    setMessage(null);
    const result = await change;
    setBusyLine(null);
    if (result.outcome === "updated") {
      const lineRemoved = result.cart.lines.length < cart.lines.length;
      setCart(result.cart);
      if (!lineRemoved || reduced) {
        setTotals(result.cart);
      }
      router.refresh();
    } else if (result.outcome === "unauthenticated") {
      router.push("/login?next=/cart");
    } else {
      setMessage(result.message);
    }
  }

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 py-12">
        <h1 className="text-heading-lg">{copy.cart.empty}</h1>
        <p className="text-body-lg text-ink-soft">{copy.cart.emptyBody}</p>
        <ButtonLink href="/search" variant="primary">
          {copy.cart.toShop}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-8 pb-24 sm:pb-0">
      <h1 className="text-heading-lg lg:text-display">{copy.cart.title}</h1>
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {message && <Notice tone="problem" role="alert" title={message} />}
          <ul className="border-t border-line">
            <AnimatePresence initial={false} onExitComplete={() => setTotals(cart)}>
              {cart.lines.map((line) => (
                <motion.li
                  key={line.variantId}
                  layout={!reduced}
                  exit={{
                    opacity: 0,
                    scaleY: 0.6,
                    transition: leave(durations.lineRemoved, reduced),
                  }}
                  style={{ originY: 0 }}
                >
                  <CartLineRow
                    line={line}
                    busy={busyLine === line.variantId}
                    onQuantity={(quantity) =>
                      apply(line.variantId, setLineQuantity(line.variantId, quantity))
                    }
                    onRemove={() => apply(line.variantId, removeLine(line.variantId))}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
        <div className="lg:sticky lg:top-8 lg:self-start">
          <OrderSummary
            subtotal={totals.subtotal}
            shippingFee={totals.shippingFee}
            total={totals.total}
          >
            {!cart.canCheckout && <p className="text-caption text-danger">{copy.cart.notReady}</p>}
            <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-page p-4 sm:static sm:border-0 sm:bg-transparent sm:p-0">
              {cart.canCheckout ? (
                <ButtonLink href="/checkout" variant="primary" fullWidth>
                  {copy.cart.checkout}
                </ButtonLink>
              ) : (
                <Button variant="primary" fullWidth disabled>
                  {copy.cart.checkout}
                </Button>
              )}
            </div>
          </OrderSummary>
        </div>
      </div>
    </div>
  );
}

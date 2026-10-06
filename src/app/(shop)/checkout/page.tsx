import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { OrderLines } from "@/components/order-lines";
import { OrderSummary } from "@/components/order-summary";
import { Notice } from "@/components/ui/notice";
import { copy } from "@/lib/copy";
import { sandboxPaymentDetails } from "@/lib/help-content";
import { getCart } from "@/server/cart";
import { getStoreSettings } from "@/server/store";
import { getViewer } from "../../_lib/viewer";

export const metadata: Metadata = { title: copy.checkout.title };

export default async function CheckoutPage() {
  const viewer = await getViewer();
  if (!viewer) {
    redirect("/login?next=/checkout");
  }
  const cart = await getCart(viewer.id);
  if (!cart.canCheckout) {
    redirect("/cart");
  }
  const { demoMode, sandboxPayments, snap } = getStoreSettings();
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-8">
      <h1 className="text-heading-lg lg:text-display">{copy.checkout.title}</h1>
      {sandboxPayments && (
        <Notice title={copy.checkout.reviewerNoteTitle}>
          <p>{copy.checkout.reviewerNote}</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            {sandboxPaymentDetails.list?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Notice>
      )}
      <CheckoutForm
        demoNotice={demoMode}
        snap={snap}
        review={
          <>
            <OrderLines lines={cart.lines.map((line) => ({ ...line, key: line.variantId }))} />
            <OrderSummary
              subtotal={cart.subtotal}
              shippingFee={cart.shippingFee}
              total={cart.total}
            />
          </>
        }
      />
    </div>
  );
}

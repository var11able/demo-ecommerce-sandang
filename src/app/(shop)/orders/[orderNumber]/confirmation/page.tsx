import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OrderLines } from "@/components/order-lines";
import { OrderSummary } from "@/components/order-summary";
import { PaymentConfirmation } from "@/components/payment-confirmation";
import { orderNumberSchema } from "@/contracts/orders";
import { copy } from "@/lib/copy";
import { StoreError } from "@/server/errors";
import { getCustomerOrder } from "@/server/orders";
import { getPaymentStatus } from "@/server/payments";
import { getStoreSettings } from "@/server/store";
import { getViewer } from "../../../../_lib/viewer";

type Props = PageProps<"/orders/[orderNumber]/confirmation">;

export const metadata: Metadata = { title: copy.confirmation.title, robots: { index: false } };

async function load(customerId: string, orderNumber: string) {
  if (!orderNumberSchema.safeParse(orderNumber).success) {
    return null;
  }
  try {
    const status = await getPaymentStatus(customerId, orderNumber);
    const order = await getCustomerOrder(customerId, orderNumber);
    return { status, order };
  } catch (error) {
    if (error instanceof StoreError && error.code === "not_found") {
      return null;
    }
    throw error;
  }
}

export default async function ConfirmationPage({ params }: Props) {
  const { orderNumber } = await params;
  const viewer = await getViewer();
  if (!viewer) {
    redirect(`/login?next=/orders/${encodeURIComponent(orderNumber)}/confirmation`);
  }
  const loaded = await load(viewer.id, orderNumber);
  if (!loaded) {
    notFound();
  }
  const { status, order } = loaded;
  return (
    <div className="mx-auto grid w-full max-w-content gap-10 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <header className="flex flex-col gap-2">
          <h1 className="text-heading-lg">{copy.confirmation.title}</h1>
          <p className="tabular text-body text-muted">{copy.order.title(order.orderNumber)}</p>
        </header>
        <PaymentConfirmation initial={status} snap={getStoreSettings().snap} />
        <OrderLines
          lines={order.lines.map((line, index) => ({
            ...line,
            key: `${index}-${line.productSlug}`,
          }))}
        />
      </div>
      <OrderSummary subtotal={order.subtotal} shippingFee={order.shippingFee} total={order.total} />
    </div>
  );
}

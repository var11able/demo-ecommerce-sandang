import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OrderPaymentPanel } from "@/components/order-payment-panel";
import { OrderView } from "@/components/order-view";
import { orderNumberSchema } from "@/contracts/orders";
import { copy } from "@/lib/copy";
import { StoreError } from "@/server/errors";
import { getCustomerOrder } from "@/server/orders";
import { getPaymentStatus } from "@/server/payments";
import { getStoreSettings } from "@/server/store";
import { getViewer } from "../../../_lib/viewer";

type Props = PageProps<"/orders/[orderNumber]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: copy.order.title((await params).orderNumber) };
}

async function load(customerId: string, orderNumber: string) {
  if (!orderNumberSchema.safeParse(orderNumber).success) {
    return null;
  }
  try {
    const status = await getPaymentStatus(customerId, orderNumber);
    const order = await getCustomerOrder(customerId, orderNumber);
    return { order, openPaymentToken: status.payment?.token ?? null };
  } catch (error) {
    if (error instanceof StoreError && error.code === "not_found") {
      return null;
    }
    throw error;
  }
}

export default async function OrderPage({ params }: Props) {
  const { orderNumber } = await params;
  const viewer = await getViewer();
  if (!viewer) {
    redirect(`/login?next=/orders/${encodeURIComponent(orderNumber)}`);
  }
  const loaded = await load(viewer.id, orderNumber);
  if (!loaded) {
    notFound();
  }
  return (
    <OrderView
      order={loaded.order}
      aside={
        <OrderPaymentPanel
          order={loaded.order}
          snap={getStoreSettings().snap}
          openPaymentToken={loaded.openPaymentToken}
        />
      }
    />
  );
}

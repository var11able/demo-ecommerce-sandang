import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { OrderList } from "@/components/order-list";
import { copy } from "@/lib/copy";
import { listCustomerOrders } from "@/server/orders";
import { getViewer } from "../../_lib/viewer";

export const metadata: Metadata = { title: copy.account.title };

export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer) {
    redirect("/login?next=/account");
  }
  const orders = await listCustomerOrders(viewer.id);
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-heading-lg lg:text-display">{copy.account.title}</h1>
          <p className="text-body text-muted">{copy.account.signedInAs(viewer.email)}</p>
        </div>
        <LogoutButton />
      </header>
      <section className="flex flex-col gap-4" aria-labelledby="orders-title">
        <h2 id="orders-title" className="text-heading">
          {copy.account.ordersTitle}
        </h2>
        <OrderList orders={orders} />
      </section>
    </div>
  );
}

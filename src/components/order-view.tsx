import Link from "next/link";
import type { ReactNode } from "react";
import type { OrderDetail } from "@/contracts/orders";
import { copy } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { OrderLines } from "./order-lines";
import { OrderSummary } from "./order-summary";
import { StatusMark } from "./status-mark";
import { Price } from "./ui/price";

export function OrderView({
  order,
  backHref = "/account",
  children,
  aside,
}: {
  order: OrderDetail;
  backHref?: string;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  const { address } = order;
  const awaitingPayment = order.status === "awaiting_payment";
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link href={backHref} className="text-caption text-muted underline underline-offset-4">
          {copy.order.backToOrders}
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="tabular text-heading-lg">{copy.order.title(order.orderNumber)}</h1>
          <StatusMark status={order.status} />
        </div>
        <p className="text-caption text-muted">
          {copy.order.placedOn(formatDateTime(order.createdAt))}
          {awaitingPayment ? ` · ${copy.order.payBy(formatDateTime(order.payBy))}` : ""}
        </p>
      </header>
      {children}
      <div className="grid gap-10 lg:grid-cols-3">
        <section className="flex flex-col gap-4 lg:col-span-2" aria-labelledby="lines-title">
          <h2 id="lines-title" className="text-heading">
            {copy.order.linesTitle}
          </h2>
          <OrderLines
            lines={order.lines.map((line, index) => ({
              ...line,
              key: `${index}-${line.productSlug}`,
            }))}
          />
          <h2 className="pt-4 text-heading">{copy.order.addressTitle}</h2>
          <address className="text-body text-ink-soft not-italic">
            {address.recipientName}
            <br />
            {address.phone}
            <br />
            {address.street}
            <br />
            {address.district}, {address.city}
            <br />
            {address.province} {address.postalCode}
          </address>
          {order.refunds.some((refund) => refund.status === "succeeded") && (
            <>
              <h2 className="pt-4 text-heading">{copy.order.refundsTitle}</h2>
              <ul className="flex flex-col gap-2 text-body">
                {order.refunds
                  .filter((refund) => refund.status === "succeeded")
                  .map((refund) => (
                    <li
                      key={refund.createdAt}
                      className="flex justify-between gap-4 border-b border-line pb-2"
                    >
                      <span className="text-ink-soft">
                        {formatDateTime(refund.createdAt)} · {refund.reason}
                      </span>
                      <Price amount={refund.amount} />
                    </li>
                  ))}
              </ul>
            </>
          )}
        </section>
        <div className="flex flex-col gap-6">
          <OrderSummary
            subtotal={order.subtotal}
            shippingFee={order.shippingFee}
            total={order.total}
          />
          {aside}
        </div>
      </div>
    </div>
  );
}

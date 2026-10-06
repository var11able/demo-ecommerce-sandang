import Link from "next/link";
import type { OrderSummary } from "@/contracts/orders";
import { copy } from "@/lib/copy";
import { formatDate } from "@/lib/format";
import { StatusMark } from "./status-mark";
import { Price } from "./ui/price";

export function OrderList({ orders }: { orders: OrderSummary[] }) {
  if (orders.length === 0) {
    return <p className="text-body-lg text-ink-soft">{copy.account.noOrders}</p>;
  }
  return (
    <ul className="border-t border-line">
      {orders.map((order) => (
        <li key={order.orderNumber}>
          <Link
            href={`/orders/${order.orderNumber}`}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-5 hover:bg-surface"
          >
            <div className="flex flex-col gap-1">
              <span className="tabular text-body-lg">{order.orderNumber}</span>
              <span className="text-caption text-muted">
                {copy.account.orderPlacedOn(formatDate(order.createdAt))} ·{" "}
                {copy.account.items(order.itemCount)}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Price amount={order.total} />
              <StatusMark status={order.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

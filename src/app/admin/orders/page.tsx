import type { Metadata } from "next";
import Link from "next/link";
import { Cell, DataTable } from "@/components/admin/data-table";
import { StatusMark } from "@/components/status-mark";
import { NavPill } from "@/components/ui/nav-pill";
import { Price } from "@/components/ui/price";
import { adminOrderListQuerySchema, type AdminOrderFilter } from "@/contracts/admin";
import { copy } from "@/lib/copy";
import { formatDate } from "@/lib/format";
import { listAdminOrders } from "@/server/admin";
import { getViewer } from "../../_lib/viewer";

export const metadata: Metadata = { title: copy.admin.nav.orders };

const filters: AdminOrderFilter[] = [
  "to_ship",
  "awaiting_payment",
  "shipped",
  "cancelled",
  "refunded",
  "all",
];

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const viewer = (await getViewer())!;
  const parameters = await searchParams;
  const parsed = adminOrderListQuerySchema.safeParse({
    status: typeof parameters.status === "string" ? parameters.status : undefined,
    q: typeof parameters.q === "string" && parameters.q.trim() ? parameters.q : undefined,
  });
  const query = parsed.success ? parsed.data : { status: "to_ship" as const };
  const orders = await listAdminOrders(viewer, query);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-heading-lg">{copy.admin.nav.orders}</h1>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ul className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <li key={filter}>
              <NavPill
                href={`/admin/orders?status=${filter}${query.q ? `&q=${encodeURIComponent(query.q)}` : ""}`}
                current={query.status === filter}
              >
                {copy.admin.filters[filter]}
              </NavPill>
            </li>
          ))}
        </ul>
        <form className="flex gap-2" role="search">
          <input type="hidden" name="status" value={query.q ? "all" : query.status} />
          <label htmlFor="order-search" className="sr-only">
            {copy.admin.searchOrders}
          </label>
          <input
            id="order-search"
            name="q"
            defaultValue={query.q}
            placeholder={copy.admin.searchOrders}
            className="min-h-11 w-64 rounded-control border border-ink bg-surface px-4 text-body"
          />
          <button
            type="submit"
            className="min-h-11 rounded-control border border-ink px-4 text-caption"
          >
            {copy.admin.search}
          </button>
        </form>
      </div>
      {orders.length === 0 ? (
        <p className="text-body text-muted">{copy.admin.noOrders}</p>
      ) : (
        <DataTable
          caption={copy.admin.nav.orders}
          columns={[
            copy.admin.columns.order,
            copy.admin.columns.customer,
            copy.admin.columns.placed,
            copy.admin.columns.items,
            copy.admin.columns.total,
            copy.admin.columns.status,
          ]}
        >
          {orders.map((order) => (
            <tr key={order.orderNumber} className="hover:bg-page">
              <Cell>
                <Link
                  href={`/admin/orders/${order.orderNumber}`}
                  className="tabular underline underline-offset-4"
                >
                  {order.orderNumber}
                </Link>
                {order.needsReview && (
                  <span className="mt-1 block text-danger">! {copy.admin.needsReview}</span>
                )}
              </Cell>
              <Cell>
                {order.customerName}
                <span className="block text-muted">{order.customerEmail}</span>
              </Cell>
              <Cell>{formatDate(order.createdAt)}</Cell>
              <Cell className="tabular">{order.itemCount}</Cell>
              <Cell>
                <Price amount={order.total} />
              </Cell>
              <Cell>
                <StatusMark status={order.status} />
              </Cell>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

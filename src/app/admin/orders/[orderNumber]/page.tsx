import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminOrderActions } from "@/components/admin/order-actions";
import { Cell, DataTable } from "@/components/admin/data-table";
import { OrderView } from "@/components/order-view";
import { Price } from "@/components/ui/price";
import { orderNumberSchema, type OrderDetail } from "@/contracts/orders";
import type { AdminOrderDetail } from "@/contracts/admin";
import { copy } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { getAdminOrder } from "@/server/admin";
import { StoreError } from "@/server/errors";
import { getViewer } from "../../../_lib/viewer";

type Props = PageProps<"/admin/orders/[orderNumber]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: copy.order.title((await params).orderNumber) };
}

async function load(orderNumber: string): Promise<AdminOrderDetail | null> {
  if (!orderNumberSchema.safeParse(orderNumber).success) {
    return null;
  }
  try {
    return await getAdminOrder((await getViewer())!, orderNumber);
  } catch (error) {
    if (error instanceof StoreError && error.code === "not_found") {
      return null;
    }
    throw error;
  }
}

export default async function AdminOrderPage({ params }: Props) {
  const order = await load((await params).orderNumber);
  if (!order) {
    notFound();
  }
  const { customer, adminPayments, refundableAmount, canShip, canCancel, ...detail } = order;
  return (
    <OrderView
      order={detail as OrderDetail}
      backHref="/admin/orders"
      aside={
        <AdminOrderActions
          orderNumber={order.orderNumber}
          canShip={canShip}
          canCancel={canCancel}
          refundableAmount={refundableAmount}
        />
      }
    >
      <section className="flex flex-col gap-2" aria-labelledby="customer-title">
        <h2 id="customer-title" className="text-heading-sm">
          {copy.admin.customerTitle}
        </h2>
        <p className="text-body">
          {customer.name} · <span className="text-muted">{customer.email}</span>
        </p>
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="admin-payments-title">
        <h2 id="admin-payments-title" className="text-heading-sm">
          {copy.admin.paymentsTitle}
        </h2>
        <DataTable
          columns={[
            copy.admin.columns.reference,
            copy.admin.columns.amount,
            copy.admin.columns.method,
            copy.admin.columns.status,
            copy.admin.columns.placed,
          ]}
        >
          {adminPayments.map((payment) => (
            <tr key={payment.reference}>
              <Cell className="tabular">
                {payment.reference}
                {payment.needsReview && (
                  <span className="mt-1 block text-danger">
                    ! {copy.admin.needsReview}: {payment.reviewReason}
                  </span>
                )}
              </Cell>
              <Cell>
                <Price amount={payment.amount} />
              </Cell>
              <Cell>{copy.order.method(payment.method)}</Cell>
              <Cell>{copy.order.paymentStatus[payment.status]}</Cell>
              <Cell>{formatDateTime(payment.createdAt)}</Cell>
            </tr>
          ))}
        </DataTable>
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="admin-refunds-title">
        <h2 id="admin-refunds-title" className="text-heading-sm">
          {copy.admin.refundsTitle}
        </h2>
        {detail.refunds.length === 0 ? (
          <p className="text-caption text-muted">{copy.admin.noRefunds}</p>
        ) : (
          <DataTable
            columns={[
              copy.admin.columns.amount,
              copy.admin.columns.reason,
              copy.admin.columns.status,
              copy.admin.columns.placed,
            ]}
          >
            {detail.refunds.map((refund) => (
              <tr key={refund.createdAt}>
                <Cell>
                  <Price amount={refund.amount} />
                </Cell>
                <Cell>{refund.reason}</Cell>
                <Cell>{refund.status}</Cell>
                <Cell>{formatDateTime(refund.createdAt)}</Cell>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
    </OrderView>
  );
}

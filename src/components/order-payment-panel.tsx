import type { OrderDetail } from "@/contracts/orders";
import { copy } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import type { SnapConfig } from "@/lib/snap";
import { PayButton } from "./pay-button";
import { ButtonLink } from "./ui/button";
import { Price } from "./ui/price";

export function OrderPaymentPanel({
  order,
  snap,
  openPaymentToken,
}: {
  order: OrderDetail;
  snap: SnapConfig;
  openPaymentToken: string | null;
}) {
  const lastPayment = order.payments.at(-1);
  const hasFailedAttempt = lastPayment?.status === "failed" || lastPayment?.status === "expired";
  return (
    <section
      aria-labelledby="payments-title"
      className="flex flex-col gap-4 border border-ink bg-surface p-6"
    >
      <h2 id="payments-title" className="text-heading-sm">
        {copy.order.paymentsTitle}
      </h2>
      {order.status === "awaiting_payment" && (
        <p className="text-body text-ink-soft">
          {order.canPay || openPaymentToken ? copy.order.needsPayment : copy.order.cannotPay}
        </p>
      )}
      {order.canPay && (
        <PayButton
          orderNumber={order.orderNumber}
          snap={snap}
          label={hasFailedAttempt ? copy.order.payAgain : copy.order.payNow}
        />
      )}
      {openPaymentToken && (
        <>
          <PayButton
            orderNumber={order.orderNumber}
            snap={snap}
            label={copy.order.continuePayment}
            existingToken={openPaymentToken}
          />
          <ButtonLink href={`/orders/${order.orderNumber}/confirmation`} variant="quiet">
            {copy.confirmation.title}
          </ButtonLink>
        </>
      )}
      {order.payments.length > 0 ? (
        <ol className="flex flex-col gap-2 border-t border-line pt-4 text-caption">
          {order.payments.map((payment, index) => (
            <li key={payment.createdAt} className="flex justify-between gap-3">
              <span className="text-muted">
                {index + 1}.{" "}
                {copy.order.attemptLine(
                  formatDateTime(payment.createdAt),
                  copy.order.method(payment.method),
                )}
              </span>
              <span className="flex gap-2">
                <Price amount={payment.amount} />
                <span>{copy.order.paymentStatus[payment.status]}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-caption text-muted">{copy.order.noPayments}</p>
      )}
    </section>
  );
}

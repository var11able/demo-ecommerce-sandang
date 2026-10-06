import type { OrderStatus } from "@/contracts/orders";
import { copy } from "@/lib/copy";
import { cx } from "@/lib/cx";

const tone: Record<OrderStatus, { classes: string; icon: string }> = {
  awaiting_payment: { classes: "border-warning text-warning", icon: "◷" },
  paid: { classes: "border-success text-success", icon: "✓" },
  shipped: { classes: "border-ink text-ink", icon: "→" },
  completed: { classes: "border-success text-success", icon: "✓" },
  cancelled: { classes: "border-danger text-danger", icon: "×" },
  refunded: { classes: "border-ink text-ink-soft", icon: "↺" },
};

export function StatusMark({ status }: { status: OrderStatus }) {
  const { classes, icon } = tone[status];
  return (
    <span
      className={cx(
        "inline-flex min-h-8 items-center gap-2 border bg-surface px-3 label-caps",
        classes,
      )}
    >
      <span aria-hidden="true">{icon}</span>
      {copy.order.status[status]}
    </span>
  );
}

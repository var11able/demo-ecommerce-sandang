import { formatRupiah } from "@/lib/format";
import { cx } from "@/lib/cx";

export function Price({ amount, className }: { amount: number; className?: string }) {
  return <span className={cx("tabular font-medium", className)}>{formatRupiah(amount)}</span>;
}

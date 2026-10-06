import Link from "next/link";
import { copy } from "@/lib/copy";
import { formatRupiah } from "@/lib/format";

const barClasses = "bg-ink px-4 py-2 text-center label-caps text-surface";

export function DemoBar() {
  return (
    <div className={barClasses}>
      {copy.demo.bar}{" "}
      <Link href="/help/how-to-pay" className="underline underline-offset-4">
        {copy.demo.testPayments}
      </Link>{" "}
      ·{" "}
      <Link href="/login" className="underline underline-offset-4">
        {copy.demo.logins}
      </Link>
    </div>
  );
}

export function AnnouncementBar({ shippingFee }: { shippingFee: number }) {
  return <div className={barClasses}>{copy.store.announcement(formatRupiah(shippingFee))}</div>;
}

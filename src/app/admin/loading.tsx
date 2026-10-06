import { copy } from "@/lib/copy";

export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">{copy.loading}</span>
      <div aria-hidden="true" className="h-12 w-64 bg-line" />
      <div aria-hidden="true" className="h-64 w-full border border-line bg-surface" />
    </div>
  );
}

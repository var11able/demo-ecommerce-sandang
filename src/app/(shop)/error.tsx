"use client";

import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

export default function ShopError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="text-heading-lg">{copy.error.title}</h1>
      <p className="text-body-lg text-ink-soft">{copy.error.body}</p>
      <Button onClick={reset}>{copy.error.retry}</Button>
    </div>
  );
}

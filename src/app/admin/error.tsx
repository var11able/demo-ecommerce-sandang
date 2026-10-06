"use client";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { copy } from "@/lib/copy";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <Notice tone="problem" role="alert" title={copy.error.title}>
        {copy.error.body}
      </Notice>
      <Button onClick={reset}>{copy.error.retry}</Button>
    </div>
  );
}

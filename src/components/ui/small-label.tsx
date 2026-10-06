import type { ReactNode } from "react";

export function SmallLabel({ children }: { children: ReactNode }) {
  return <p className="label-caps text-ink">{children}</p>;
}

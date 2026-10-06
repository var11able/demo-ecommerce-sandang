import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export function navPillClasses(current: boolean): string {
  return cx(
    "inline-flex min-h-11 shrink-0 items-center px-2 label-caps whitespace-nowrap transition-colors",
    current
      ? "bg-ink text-surface"
      : "bg-transparent text-ink hover:underline hover:underline-offset-4",
  );
}

export function NavPill({
  href,
  current = false,
  children,
}: {
  href: string;
  current?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={navPillClasses(current)}
    >
      {children}
    </Link>
  );
}

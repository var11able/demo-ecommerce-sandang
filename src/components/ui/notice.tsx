import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { durations, riseDistance } from "@/lib/motion-presets";
import { Appear } from "../motion/appear";

export type NoticeTone = "info" | "success" | "problem" | "waiting";

const toneClasses: Record<NoticeTone, string> = {
  info: "border-ink",
  success: "border-success",
  problem: "border-danger",
  waiting: "border-warning",
};

const toneIcon: Record<NoticeTone, string> = {
  info: "i",
  success: "✓",
  problem: "!",
  waiting: "…",
};

const iconClasses: Record<NoticeTone, string> = {
  info: "bg-ink",
  success: "bg-success",
  problem: "bg-danger",
  waiting: "bg-warning",
};

export function Notice({
  tone = "info",
  title,
  children,
  role,
}: {
  tone?: NoticeTone;
  title?: string;
  children?: ReactNode;
  role?: "status" | "alert";
}) {
  return (
    <Appear duration={durations.quick} rise={riseDistance.notice}>
      <div role={role} className={cx("flex gap-4 border bg-surface p-5", toneClasses[tone])}>
        <span
          aria-hidden="true"
          className={cx(
            "flex size-8 shrink-0 items-center justify-center text-caption text-surface",
            iconClasses[tone],
          )}
        >
          {toneIcon[tone]}
        </span>
        <div className="flex flex-col gap-2">
          {title && <p className="text-heading-sm">{title}</p>}
          {children && <div className="text-body text-ink-soft">{children}</div>}
        </div>
      </div>
    </Appear>
  );
}

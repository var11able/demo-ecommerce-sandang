"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { arrive, durations } from "@/lib/motion-presets";

let interactive = false;

export function InteractiveMarker() {
  useEffect(() => {
    interactive = true;
  }, []);
  return null;
}

function useEnteredAfterLoad(): boolean {
  const [entered] = useState(() => interactive);
  return entered;
}

export function Appear({
  children,
  rise = 0,
  duration,
  className,
}: {
  children: ReactNode;
  rise?: number;
  duration: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const animateIn = useEnteredAfterLoad() && !reduced;
  return (
    <motion.div
      className={className}
      initial={animateIn ? { opacity: 0, y: rise } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={arrive(duration, reduced)}
    >
      {children}
    </motion.div>
  );
}

export function PageFade({ children }: { children: ReactNode }) {
  return <Appear duration={durations.pageChange}>{children}</Appear>;
}

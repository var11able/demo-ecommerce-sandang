"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { arrive, leave } from "@/lib/motion-presets";

export function Swap({
  swapKey,
  duration,
  rise = 0,
  children,
  className,
}: {
  swapKey: string;
  duration: number;
  rise?: number;
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const distance = reduced ? 0 : rise;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={swapKey}
        className={className}
        initial={{ opacity: 0, y: distance }}
        animate={{ opacity: 1, y: 0, transition: arrive(duration, reduced) }}
        exit={{ opacity: 0, transition: leave(duration, reduced) }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function SwapText({
  swapKey,
  duration,
  children,
}: {
  swapKey: string;
  duration: number;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={swapKey}
        className="inline-block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: arrive(duration, reduced) }}
        exit={{ opacity: 0, transition: leave(duration, reduced) }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

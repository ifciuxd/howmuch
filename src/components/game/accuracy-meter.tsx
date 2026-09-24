"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

const RANGE = 0.6; // ±60% fits the track; beyond that the marker pins to the edge.

/** Real price in the middle, your guess slides to where it landed. */
export function AccuracyMeter({ guess, actual, delay = 0, className }: { guess: number; actual: number; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  const signed = (guess - actual) / actual;
  const clamped = Math.max(-RANGE, Math.min(RANGE, signed));
  const pos = 50 + (clamped / RANGE) * 50;
  const band = (pct: number) => `${50 - (pct / RANGE) * 50}%`;
  return (
    <div className={cn("relative pt-6 pb-6", className)} aria-hidden>
      <div className="relative h-2 rounded-full bg-surface-dark-raised">
        <div className="absolute inset-y-0 rounded-full bg-text-inverse/10" style={{ left: band(0.2), right: band(0.2) }} />
        <div className="absolute inset-y-0 rounded-full bg-accent/35" style={{ left: band(0.05), right: band(0.05) }} />
        <div className="absolute top-1/2 left-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-text-inverse" />
      </div>
      <span className="absolute top-0 left-1/2 -translate-x-1/2 text-caption font-bold tracking-[0.1em] text-text-inverse-muted uppercase wdth-expanded">Real</span>
      <motion.div
        className="absolute top-6 -mt-2 flex -translate-x-1/2 flex-col items-center"
        initial={{ left: "50%", opacity: 0 }}
        animate={{ left: `${pos}%`, opacity: 1 }}
        transition={reduce ? { duration: 0 } : { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="size-4 rounded-full border-[3px] border-surface-dark bg-accent" />
        <span className="mt-1 text-caption font-bold tracking-[0.1em] text-accent uppercase wdth-expanded">You</span>
      </motion.div>
      <div className="mt-6 flex justify-between text-caption font-semibold tracking-[0.1em] text-text-inverse-muted uppercase">
        <span>Under</span>
        <span>Over</span>
      </div>
    </div>
  );
}

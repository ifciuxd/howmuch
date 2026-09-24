"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/format";

/** Counts up to `value` with an ease-out curve. Instant with reduced motion. */
export function ScoreCounter({
  value,
  from = 0,
  durationMs = 900,
  delayMs = 0,
  prefix = "",
  className,
}: {
  value: number;
  from?: number;
  durationMs?: number;
  delayMs?: number;
  prefix?: string;
  className?: string;
}) {
  const [shown, setShown] = useState(from);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || durationMs <= 0) {
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }
    let start: number | null = null;
    const tick = (t: number) => {
      if (start == null) start = t + delayMs;
      const p = Math.min(1, Math.max(0, (t - start) / durationMs));
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, from, durationMs, delayMs]);

  return (
    <span className={className}>
      <span aria-hidden className="tnum">
        {prefix}
        {formatNumber(shown)}
      </span>
      <span className="sr-only">
        {prefix}
        {formatNumber(value)}
      </span>
    </span>
  );
}

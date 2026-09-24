"use client";

import { useEffect, useState } from "react";
import { msUntilNextDaily } from "@/game/daily";
import { formatDuration } from "@/lib/format";

/** Time until the next daily (UTC midnight). Real reset time — no fake urgency. */
export function DailyCountdown({ className }: { className?: string }) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(msUntilNextDaily());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return <span className={className} suppressHydrationWarning>{ms == null ? "—" : formatDuration(ms)}</span>;
}

import type { RoundSummary } from "@/services/game-service";
import { cn } from "@/lib/cn";
import { tierDotClass } from "./tier-style";

export function RoundProgress({ rounds, current, className, tone = "light" }: { rounds: RoundSummary[]; current: number; className?: string; tone?: "light" | "dark" }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <ol className="flex items-center gap-1.5" aria-hidden>
        {rounds.map((r) => (
          <li
            key={r.index}
            className={cn(
              "size-2.5 rounded-full transition-colors duration-(--duration-medium)",
              r.done ? tierDotClass(r.tier, r.score) : r.index === current ? "bg-transparent ring-2 ring-accent" : cn("border-2", tone === "dark" ? "border-border-dark" : "border-border-strong"),
            )}
          />
        ))}
      </ol>
      <span className={cn("label tnum", tone === "dark" ? "text-text-inverse-muted" : "text-text-secondary")}>
        Round {Math.min(current + 1, rounds.length)} / {rounds.length}
      </span>
    </div>
  );
}

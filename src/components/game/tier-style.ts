import type { Tier } from "@/game/scoring";

/** Visual weight per result tier — restrained: orange for great, ink for fine, muted for misses. */
export function tierDotClass(tier: Tier | null, score: number | null): string {
  if (tier == null || score == null) return "border-2 border-border-strong bg-transparent";
  if (tier === "BULLSEYE" || tier === "EXCELLENT" || tier === "GREAT") return "bg-accent";
  if (tier === "GOOD") return "bg-text";
  if (tier === "OFF") return "bg-text-muted";
  return "bg-border-strong";
}

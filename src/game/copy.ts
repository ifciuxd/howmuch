import { hashString } from "./rng";
import type { Direction, Tier } from "./scoring";

/**
 * Round-result lines. Witty, never insulting. Picked deterministically from a
 * seed (the round id) so a refresh never changes the joke.
 */
const LINES: Record<Tier, readonly string[]> = {
  BULLSEYE: ["Ridiculously close.", "Are you a broker?", "Spot on. Suspiciously spot on."],
  EXCELLENT: ["You actually know your market.", "You're getting dangerous.", "That's a sharp eye."],
  GREAT: ["You know the market.", "Very respectable.", "Solid read."],
  GOOD: ["Not bad.", "In the neighbourhood.", "Close enough to negotiate."],
  OFF: ["Not terrible.", "The market had other plans.", "Worth a second viewing."],
  WAY_OFF: ["Yeah… not quite.", "Ouch.", "The market disagrees."],
};

const WAY_OFF_OVER = ["Way too optimistic.", "The seller would love you.", "Somebody's been watching luxury tours."];
const WAY_OFF_UNDER = ["The market disagrees.", "If only.", "Bargain hunter spotted."];

export function resultLine(tier: Tier, direction: Direction, seed: string): string {
  let pool: readonly string[] = LINES[tier];
  if (tier === "WAY_OFF") pool = direction === "over" ? WAY_OFF_OVER : WAY_OFF_UNDER;
  return pool[hashString(seed) % pool.length];
}

/** Headline for the final results screen. */
export function gameVerdict(totalScore: number, maxScore: number): string {
  const ratio = maxScore > 0 ? totalScore / maxScore : 0;
  if (ratio >= 0.9) return "You actually know your market.";
  if (ratio >= 0.75) return "You're getting dangerous.";
  if (ratio >= 0.6) return "Not bad at all.";
  if (ratio >= 0.4) return "The market had a few surprises.";
  return "The market had other plans.";
}

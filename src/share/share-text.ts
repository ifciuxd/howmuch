import { tierEmoji, type Tier } from "@/game/scoring";
import { formatNumber, formatPercent, formatShareDate } from "@/lib/format";

/**
 * Compact, spoiler-free share text. Never includes homes, cities or prices.
 */
export function shareHeadline(mode: string, scopeKey: string | null, scopeName?: string | null): string {
  if (mode === "DAILY" && scopeKey) return `DAILY · ${formatShareDate(scopeKey)}`;
  if (mode === "CITY") return (scopeName ?? scopeKey ?? "CITY").toUpperCase();
  if (mode === "COUNTRY") return (scopeName ?? scopeKey ?? "COUNTRY").toUpperCase();
  return "QUICK PLAY";
}

export function buildShareText(opts: {
  mode: string;
  scopeKey: string | null;
  scopeName?: string | null;
  totalScore: number;
  maxScore: number;
  accuracy: number;
  tiers: Tier[];
  url: string;
}): string {
  return [
    "HOWMUCH? HOMES",
    shareHeadline(opts.mode, opts.scopeKey, opts.scopeName),
    "",
    opts.tiers.map(tierEmoji).join(" "),
    "",
    `${formatNumber(opts.totalScore)} / ${formatNumber(opts.maxScore)}`,
    `${formatPercent(opts.accuracy)} accuracy`,
    "",
    "Can you beat me?",
    opts.url,
  ].join("\n");
}

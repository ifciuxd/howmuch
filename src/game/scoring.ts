/**
 * HOWMUCH? scoring — the single source of truth for points.
 *
 * Runs on the server only when a guess is locked in; the browser never sends a score.
 *
 * How it works (the version we tell players):
 *   • You're scored on how far off you were, in percent of the real price.
 *   • Within 1% is a bullseye: 1,000 points.
 *   • Points fall off along a curve — gently at first, then fast.
 *   • 80% off or worse scores zero. Never negative.
 *
 * Curve:  score = 1000 × (1 − min(error, 0.8) / 0.8) ^ 1.6
 *
 *   error   1%   5%   10%   20%   30%   40%   50%   60%   80%
 *   points  1000 902  808   631   471   330   208   109   0
 */

export const MAX_ROUND_SCORE = 1000;
export const BULLSEYE_ERROR = 0.01;
export const ZERO_POINT_ERROR = 0.8;
export const CURVE_EXPONENT = 1.6;

export type Tier = "BULLSEYE" | "EXCELLENT" | "GREAT" | "GOOD" | "OFF" | "WAY_OFF";

export const TIERS: ReadonlyArray<{ tier: Tier; maxError: number; label: string }> = [
  { tier: "BULLSEYE", maxError: 0.01, label: "Bullseye" },
  { tier: "EXCELLENT", maxError: 0.05, label: "Excellent" },
  { tier: "GREAT", maxError: 0.1, label: "Great" },
  { tier: "GOOD", maxError: 0.2, label: "Good" },
  { tier: "OFF", maxError: 0.4, label: "Off" },
  { tier: "WAY_OFF", maxError: Number.POSITIVE_INFINITY, label: "Way off" },
];

export type Direction = "over" | "under" | "exact";

export interface GuessScore {
  guess: number;
  actual: number;
  /** |guess − actual| in currency units. */
  absoluteDiff: number;
  /** |guess − actual| / actual, e.g. 0.064 for 6.4% off. */
  errorPct: number;
  /** max(0, 1 − errorPct), e.g. 0.936. Shown as "93.6% accurate". */
  accuracy: number;
  score: number;
  tier: Tier;
  direction: Direction;
}

export function tierForError(errorPct: number): Tier {
  for (const t of TIERS) if (errorPct <= t.maxError + 1e-12) return t.tier;
  return "WAY_OFF";
}

export function tierLabel(tier: Tier): string {
  return TIERS.find((t) => t.tier === tier)?.label ?? tier;
}

/** Points for a given relative error. Pure, deterministic, never negative. */
export function pointsForError(errorPct: number): number {
  if (!Number.isFinite(errorPct) || errorPct < 0) return 0;
  if (errorPct <= BULLSEYE_ERROR + 1e-12) return MAX_ROUND_SCORE;
  const clamped = Math.min(errorPct, ZERO_POINT_ERROR);
  const remaining = 1 - clamped / ZERO_POINT_ERROR;
  return Math.max(0, Math.round(MAX_ROUND_SCORE * Math.pow(remaining, CURVE_EXPONENT)));
}

export function scoreGuess(guess: number, actual: number): GuessScore {
  if (!Number.isFinite(actual) || actual <= 0) throw new Error("Actual value must be a positive number");
  if (!Number.isFinite(guess) || guess <= 0) throw new Error("Guess must be a positive number");
  const absoluteDiff = Math.abs(guess - actual);
  const errorPct = absoluteDiff / actual;
  const accuracy = Math.max(0, 1 - errorPct);
  return {
    guess,
    actual,
    absoluteDiff,
    errorPct,
    accuracy,
    score: pointsForError(errorPct),
    tier: tierForError(errorPct),
    direction: guess === actual ? "exact" : guess > actual ? "over" : "under",
  };
}

export interface GameSummary {
  totalScore: number;
  maxScore: number;
  /** Mean of per-round accuracy (0–1). */
  averageAccuracy: number;
  /** Mean of per-round error (0–∞). */
  averageError: number;
  bestRoundIndex: number;
  worstRoundIndex: number;
}

export function summarizeRounds(rounds: ReadonlyArray<Pick<GuessScore, "score" | "accuracy" | "errorPct">>): GameSummary {
  if (rounds.length === 0) {
    return { totalScore: 0, maxScore: 0, averageAccuracy: 0, averageError: 0, bestRoundIndex: -1, worstRoundIndex: -1 };
  }
  let best = 0;
  let worst = 0;
  let total = 0;
  let acc = 0;
  let err = 0;
  rounds.forEach((r, i) => {
    total += r.score;
    acc += r.accuracy;
    err += r.errorPct;
    if (r.score > rounds[best].score) best = i;
    if (r.score < rounds[worst].score) worst = i;
  });
  return {
    totalScore: total,
    maxScore: rounds.length * MAX_ROUND_SCORE,
    averageAccuracy: acc / rounds.length,
    averageError: err / rounds.length,
    bestRoundIndex: best,
    worstRoundIndex: worst,
  };
}

/** Emoji used in share text: the quality of the house mirrors the quality of the guess. */
export function tierEmoji(tier: Tier): string {
  switch (tier) {
    case "BULLSEYE":
      return "🎯";
    case "EXCELLENT":
    case "GREAT":
    case "GOOD":
      return "🏠";
    case "OFF":
      return "🛖";
    default:
      return "🏚️";
  }
}

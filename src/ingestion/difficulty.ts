/**
 * Difficulty 1 (easy) – 10 (brutal). Stored independently of score.
 *
 * On import we only have the facts, so this is a heuristic: unusual formats
 * and extremes are harder to price. Once enough players have guessed a home,
 * `difficultyFromErrors` replaces the guess with evidence.
 */

interface DifficultyInput {
  propertyType: string;
  areaM2: number | null;
  rooms: number | null;
  yearBuilt: number | null;
  floor: number | null;
}

export function estimateDifficulty(p: DifficultyInput): number {
  let d = 4;
  if (["PENTHOUSE", "VILLA", "LOFT"].includes(p.propertyType)) d += 2;
  if (p.propertyType === "HOUSE" || p.propertyType === "TOWNHOUSE") d += 1;
  if (p.areaM2 != null && p.areaM2 > 140) d += 1;
  if (p.areaM2 != null && p.areaM2 < 28) d += 1;
  if (p.yearBuilt != null && p.yearBuilt < 1920) d += 1;
  if (p.areaM2 != null && p.rooms != null && p.rooms > 0 && p.areaM2 / p.rooms > 45) d += 1;
  if (p.floor != null && p.floor >= 15) d += 1;
  return Math.max(1, Math.min(10, d));
}

export const MIN_GUESSES_FOR_CALIBRATION = 20;

/** Median error of real guesses → difficulty. 5% → 1, 40%+ → 10. */
export function difficultyFromErrors(errorPcts: number[]): number | null {
  if (errorPcts.length < MIN_GUESSES_FOR_CALIBRATION) return null;
  const sorted = errorPcts.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const scaled = 1 + ((Math.min(Math.max(median, 0.05), 0.4) - 0.05) / 0.35) * 9;
  return Math.round(scaled);
}

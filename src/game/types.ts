import type { Tier } from "./scoring";

/**
 * Product-agnostic game types.
 *
 * A HOWMUCH? product (HOMES today; CARS, WATCHES… later) provides items with a
 * hidden numeric answer. The engine only knows about ids, answers and the
 * attributes it needs for variety — the product decides what players see.
 */

export type ProductKey = "HOMES";
export type GameModeKey = "QUICK" | "DAILY" | "CITY" | "COUNTRY";

export const ROUNDS_PER_GAME = 5;

/** Minimal attributes the selector needs to build a varied, fair game. */
export interface SelectableItem {
  id: string;
  /** Primary grouping (city slug for homes). */
  group: string;
  /** Secondary grouping (country code for homes). */
  region: string;
  /** Item sub-type (apartment, villa…). */
  kind: string;
  /** Relative price segment inside its group. */
  segment: "budget" | "mid" | "luxury";
  difficulty: number;
}

/** What the client receives for a round before guessing — no answer, ever. */
export interface PublicRound<TFacts = unknown> {
  gameId: string;
  index: number;
  roundCount: number;
  item: TFacts;
}

export interface RoundReveal {
  index: number;
  guess: number;
  actual: number;
  currency: string;
  absoluteDiff: number;
  errorPct: number;
  accuracy: number;
  score: number;
  tier: Tier;
  direction: "over" | "under" | "exact";
  line: string;
  /** Product-specific unit metric (price per m² for homes). */
  unitValue: number | null;
  unitLabel: string | null;
}

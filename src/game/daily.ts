import { createRng, type Rng, shuffle } from "./rng";
import { NotEnoughItemsError } from "./selection";
import type { SelectableItem } from "./types";

/**
 * Daily challenge — same five items for everyone on a UTC date.
 *
 * seed = "HOMES:YYYY-MM-DD". Slots give each day a shape:
 *   1. easy  2. medium  3. hard  4. a country not seen yet today  5. surprise
 * Any slot that can't be filled strictly falls back to the closest match, so
 * a day is always playable when at least five items exist.
 */

export const DAILY_SLOTS = ["easy", "medium", "hard", "new-country", "surprise"] as const;
export type DailySlot = (typeof DAILY_SLOTS)[number];

export function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = new Date(`${key}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && utcDateKey(d) === key;
}

export function previousDateKey(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return utcDateKey(d);
}

export function dailySeed(product: string, dateKey: string): string {
  return `${product}:${dateKey}`;
}

/** Milliseconds until the next UTC midnight — when a new daily unlocks. */
export function msUntilNextDaily(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
}

function slotMatches(slot: DailySlot, item: SelectableItem, picked: SelectableItem[]): boolean {
  switch (slot) {
    case "easy":
      return item.difficulty <= 3;
    case "medium":
      return item.difficulty >= 4 && item.difficulty <= 6;
    case "hard":
      return item.difficulty >= 7;
    case "new-country":
      return !picked.some((p) => p.region === item.region);
    case "surprise":
      return !picked.some((p) => p.group === item.group);
  }
}

function slotDistance(slot: DailySlot, item: SelectableItem): number {
  switch (slot) {
    case "easy":
      return Math.abs(item.difficulty - 2);
    case "medium":
      return Math.abs(item.difficulty - 5);
    case "hard":
      return Math.abs(item.difficulty - 8);
    default:
      return 0;
  }
}

export function selectDaily<T extends SelectableItem>(pool: readonly T[], seed: string, rng: Rng = createRng(seed)): T[] {
  if (pool.length < DAILY_SLOTS.length) throw new NotEnoughItemsError(DAILY_SLOTS.length, pool.length);
  // Sort first so the result depends only on the seed and the set of items, not on query order.
  const ordered = shuffle(rng, pool.slice().sort((a, b) => (a.id < b.id ? -1 : 1)));
  const picked: T[] = [];
  for (const slot of DAILY_SLOTS) {
    const free = ordered.filter((it) => !picked.includes(it));
    // Strict: slot rule + a city we haven't used today.
    let choice =
      free.find((it) => slotMatches(slot, it, picked) && !picked.some((p) => p.group === it.group)) ??
      free.find((it) => slotMatches(slot, it, picked));
    if (!choice) {
      // Closest match, preferring new cities.
      choice = free
        .slice()
        .sort(
          (a, b) =>
            Number(picked.some((p) => p.group === a.group)) - Number(picked.some((p) => p.group === b.group)) ||
            slotDistance(slot, a) - slotDistance(slot, b),
        )[0];
    }
    picked.push(choice);
  }
  return picked;
}

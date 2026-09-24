import { type Rng, shuffle } from "./rng";
import type { GameModeKey, SelectableItem } from "./types";

/**
 * Round selection with variety rules.
 *
 * Quick Play should feel globally varied: no two homes from the same city,
 * at most two per country, at most two luxury homes, at most two of the same
 * type, and the first two rounds stay approachable. Rules relax step by step
 * when the pool is too small, so a game can always be built if enough items exist.
 */

export interface SelectionOptions {
  count: number;
  mode: GameModeKey;
  rng: Rng;
  /** Items the player saw recently — avoided while possible. */
  recentIds?: ReadonlySet<string>;
}

interface Rules {
  uniqueGroup: boolean;
  maxPerRegion: number;
  maxLuxury: number;
  maxPerKind: number;
  gentleStart: boolean;
  avoidRecent: boolean;
}

const RELAXATION: Rules[] = [
  { uniqueGroup: true, maxPerRegion: 2, maxLuxury: 2, maxPerKind: 2, gentleStart: true, avoidRecent: true },
  { uniqueGroup: true, maxPerRegion: 3, maxLuxury: 3, maxPerKind: 3, gentleStart: true, avoidRecent: true },
  { uniqueGroup: false, maxPerRegion: 5, maxLuxury: 3, maxPerKind: 3, gentleStart: false, avoidRecent: true },
  { uniqueGroup: false, maxPerRegion: 99, maxLuxury: 99, maxPerKind: 99, gentleStart: false, avoidRecent: false },
];

const GENTLE_MAX_DIFFICULTY = 6;
const GENTLE_ROUNDS = 2;

function fits(item: SelectableItem, picked: SelectableItem[], slot: number, rules: Rules, opts: SelectionOptions): boolean {
  if (picked.some((p) => p.id === item.id)) return false;
  if (rules.avoidRecent && opts.recentIds?.has(item.id)) return false;
  // In CITY / COUNTRY modes the scope already fixes group/region; variety comes from the other rules.
  const scoped = opts.mode === "CITY" || opts.mode === "COUNTRY";
  if (!scoped && rules.uniqueGroup && picked.some((p) => p.group === item.group)) return false;
  if (!scoped && picked.filter((p) => p.region === item.region).length >= rules.maxPerRegion) return false;
  if (opts.mode === "COUNTRY" && rules.uniqueGroup && picked.filter((p) => p.group === item.group).length >= 2) return false;
  if (item.segment === "luxury" && picked.filter((p) => p.segment === "luxury").length >= rules.maxLuxury) return false;
  if (picked.filter((p) => p.kind === item.kind).length >= rules.maxPerKind) return false;
  if (rules.gentleStart && slot < GENTLE_ROUNDS && item.difficulty > GENTLE_MAX_DIFFICULTY) return false;
  return true;
}

export function selectRounds<T extends SelectableItem>(pool: readonly T[], opts: SelectionOptions): T[] {
  if (pool.length < opts.count) {
    throw new NotEnoughItemsError(opts.count, pool.length);
  }
  const shuffled = shuffle(opts.rng, pool);
  const picked: T[] = [];
  for (let slot = 0; slot < opts.count; slot++) {
    let choice: T | undefined;
    for (const rules of RELAXATION) {
      choice = shuffled.find((item) => fits(item, picked, slot, rules, opts));
      if (choice) break;
    }
    if (!choice) throw new NotEnoughItemsError(opts.count, pool.length);
    picked.push(choice);
  }
  // Keep the gentle start even when relaxation kicked in: easiest first two rounds lead.
  return orderForFlow(picked);
}

/** Ensure the opening rounds are the most approachable ones without fully sorting (keeps surprise). */
function orderForFlow<T extends SelectableItem>(items: T[]): T[] {
  const out = items.slice();
  for (let slot = 0; slot < Math.min(GENTLE_ROUNDS, out.length); slot++) {
    if (out[slot].difficulty <= GENTLE_MAX_DIFFICULTY) continue;
    const swapWith = out.findIndex((it, i) => i >= GENTLE_ROUNDS && it.difficulty <= GENTLE_MAX_DIFFICULTY);
    if (swapWith >= 0) [out[slot], out[swapWith]] = [out[swapWith], out[slot]];
  }
  return out;
}

export class NotEnoughItemsError extends Error {
  constructor(
    public readonly needed: number,
    public readonly available: number,
  ) {
    super(`Not enough items to build a game (needed ${needed}, available ${available})`);
    this.name = "NotEnoughItemsError";
  }
}

/** Label items by relative price inside their group (quartiles → budget / mid / luxury). */
export function segmentByGroup<T extends { id: string; group: string; price: number }>(
  items: readonly T[],
): Map<string, SelectableItem["segment"]> {
  const byGroup = new Map<string, T[]>();
  for (const it of items) {
    const list = byGroup.get(it.group) ?? [];
    list.push(it);
    byGroup.set(it.group, list);
  }
  const out = new Map<string, SelectableItem["segment"]>();
  for (const list of byGroup.values()) {
    const sorted = list.slice().sort((a, b) => a.price - b.price);
    sorted.forEach((it, i) => {
      const q = sorted.length === 1 ? 0.5 : i / (sorted.length - 1);
      out.set(it.id, q >= 0.75 ? "luxury" : q <= 0.25 ? "budget" : "mid");
    });
  }
  return out;
}

/**
 * Deterministic pseudo-random helpers.
 *
 * Everything that must be reproducible — the daily challenge, demo artwork,
 * copy variants — goes through these so the same seed always yields the same result.
 */

/** 32-bit FNV-1a hash of a string. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type Rng = () => number;

/** mulberry32 — small, fast, good enough for games. Returns floats in [0, 1). */
export function createRng(seed: number | string): Rng {
  let a = typeof seed === "string" ? hashString(seed) : seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Non-deterministic seed for casual games. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}

export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function randRange(rng: Rng, min: number, max: number): number {
  return rng() * (max - min) + min;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error("pick() on empty list");
  return items[Math.floor(rng() * items.length)];
}

export function chance(rng: Rng, p: number): boolean {
  return rng() < p;
}

/** Fisher–Yates shuffle returning a new array. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Helpers shared by listing-page parsers. Parsers are pure: HTML in, RawListing out. */

export function extractNextData(html: string): unknown | null {
  const m = /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

export function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) out.push(...parsed);
      else if (parsed && typeof parsed === "object" && Array.isArray((parsed as { "@graph"?: unknown[] })["@graph"])) out.push(...(parsed as { "@graph": unknown[] })["@graph"]);
      else out.push(parsed);
    } catch {
      /* ignore malformed blocks */
    }
  }
  return out;
}

export function metaContent(html: string, property: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property.replace(/[.:]/g, "\\$&")}["'][^>]*>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const c = /content=["']([^"']*)["']/i.exec(m[0]);
    if (c) out.push(decodeEntities(c[1]));
  }
  return out;
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/** Depth-first search for the first object satisfying `test`. */
export function findObject(root: unknown, test: (o: Record<string, Json>) => boolean, maxDepth = 14): Record<string, Json> | null {
  const stack: Array<{ v: unknown; d: number }> = [{ v: root, d: 0 }];
  while (stack.length) {
    const { v, d } = stack.pop()!;
    if (!v || typeof v !== "object" || d > maxDepth) continue;
    if (!Array.isArray(v) && test(v as Record<string, Json>)) return v as Record<string, Json>;
    const children = Array.isArray(v) ? v : Object.values(v as object);
    for (let i = children.length - 1; i >= 0; i--) stack.push({ v: children[i], d: d + 1 });
  }
  return null;
}

/** Depth-first search for arrays whose items satisfy `test` (used for search result pages). */
export function findArray(root: unknown, test: (o: Record<string, Json>) => boolean, maxDepth = 14): Array<Record<string, Json>> | null {
  const stack: Array<{ v: unknown; d: number }> = [{ v: root, d: 0 }];
  while (stack.length) {
    const { v, d } = stack.pop()!;
    if (!v || typeof v !== "object" || d > maxDepth) continue;
    if (Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === "object" && !Array.isArray(x)) && test(v[0] as Record<string, Json>)) {
      return v as Array<Record<string, Json>>;
    }
    const children = Array.isArray(v) ? v : Object.values(v as object);
    for (let i = children.length - 1; i >= 0; i--) stack.push({ v: children[i], d: d + 1 });
  }
  return null;
}

export function get(o: unknown, path: string): unknown {
  let cur: unknown = o;
  for (const key of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export function firstString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    if (Array.isArray(v) && v.length && (typeof v[0] === "string" || typeof v[0] === "number")) return String(v[0]);
  }
  return undefined;
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  jeden: 1, dwa: 2, trzy: 3, cztery: 4, piec: 5, "pięć": 5, szesc: 6, "sześć": 6,
};

/** "THREE", "three", "3", "more" → number */
export function roomsFrom(v: unknown): number | undefined {
  const s = firstString(v)?.toLowerCase();
  if (!s) return undefined;
  if (/^\d+$/.test(s)) return Number(s);
  if (WORD_NUMBERS[s] != null) return WORD_NUMBERS[s];
  if (s === "more" || s === "ten_or_more" || s === "more_than_ten") return 10;
  const m = /(\d+)/.exec(s);
  return m ? Number(m[1]) : undefined;
}

/** "floor_2", "ground_floor", "SECOND", "parter", "10" → number */
export function floorFrom(v: unknown): number | undefined {
  const s = firstString(v)?.toLowerCase();
  if (!s) return undefined;
  if (s.includes("ground") || s === "parter" || s === "floor_0") return 0;
  if (s.includes("cellar") || s.includes("suterena") || s.includes("basement")) return -1;
  if (s.includes("higher_10") || s.includes("above_10")) return 11;
  const ordinals: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };
  if (ordinals[s] != null) return ordinals[s];
  const m = /(-?\d+)/.exec(s);
  return m ? Number(m[1]) : undefined;
}

/** Keep https image URLs, drop duplicates and tiny thumbnails. */
export function cleanImages(urls: unknown[], max = 12): string[] {
  const out: string[] = [];
  for (const u of urls) {
    if (typeof u !== "string") continue;
    let url = u.trim().replace(/^\/\//, "https://");
    url = url.replace("{width}", "1280").replace("{height}", "960");
    if (!/^https?:\/\//i.test(url)) continue;
    if (!out.includes(url)) out.push(url);
    if (out.length >= max) break;
  }
  return out;
}

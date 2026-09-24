import type { RawListing } from "../types";

/** ManualJSON adapter: an array of objects using the same field names as the CSV. */
export function parseListingsJson(text: string): { records: RawListing[]; error?: string } {
  try {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : Array.isArray(data?.properties) ? data.properties : null;
    if (!list) return { records: [], error: "Expected a JSON array (or { \"properties\": [...] })" };
    return { records: list.map((r: RawListing, i: number) => ({ ...r, row: i + 1 })) };
  } catch (e) {
    return { records: [], error: `Invalid JSON: ${(e as Error).message}` };
  }
}

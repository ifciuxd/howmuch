import type { RawListing } from "../../../types";
import { parseOlxListing, parseOlxSearch } from "./olx";
import { parseOtodomListing, parseOtodomSearch } from "./otodom";
import { parseStructuredData } from "./structured-data";

export type PortalId = "otodom" | "olx" | "generic";

export function portalFor(url: string): PortalId {
  const host = new URL(url).hostname;
  if (host.endsWith("otodom.pl")) return "otodom";
  if (host.endsWith("olx.pl")) return "olx";
  return "generic";
}

/** Heuristic: is this a search/results page rather than a single listing? */
export function isSearchUrl(url: string): boolean {
  const u = new URL(url);
  if (u.hostname.endsWith("otodom.pl")) return u.pathname.includes("/wyniki/");
  if (u.hostname.endsWith("olx.pl")) return !u.pathname.includes("/d/oferta/") && !u.pathname.includes("/oferta/");
  return false;
}

/** Listing page → one RawListing, trying the site parser first, then structured data. */
export function parseListingPage(url: string, html: string): RawListing | null {
  const portal = portalFor(url);
  const specific = portal === "otodom" ? parseOtodomListing(html, url) : portal === "olx" ? parseOlxListing(html, url) : null;
  const generic = parseStructuredData(html, url);
  if (!specific) return generic;
  if (!generic) return specific;
  // Fill gaps in the site-specific result with whatever structured data provides.
  const merged: RawListing = { ...generic };
  for (const [k, v] of Object.entries(specific)) {
    if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)) (merged as Record<string, unknown>)[k] = v;
  }
  return merged;
}

export function parseSearchPage(url: string, html: string): RawListing[] {
  const portal = portalFor(url);
  if (portal === "otodom") return parseOtodomSearch(html);
  if (portal === "olx") return parseOlxSearch(html);
  return [];
}

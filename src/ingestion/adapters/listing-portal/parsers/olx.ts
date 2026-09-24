import type { RawListing } from "../../../types";
import { cleanImages, findArray, findObject, firstString, floorFrom, get, roomsFrom } from "./common";

/**
 * olx.pl — reads `window.__PRERENDERED_STATE__`.
 * Only facts needed for the game are taken: no descriptions, no seller data.
 */

const SOURCE = "olx.pl";

export function extractOlxState(html: string): unknown | null {
  const m = /__PRERENDERED_STATE__\s*=\s*("(?:[^"\\]|\\.)*")/.exec(html);
  if (!m) return null;
  try {
    const inner = JSON.parse(m[1]);
    return typeof inner === "string" ? JSON.parse(inner) : inner;
  } catch {
    return null;
  }
}

type Param = { key?: string; normalizedValue?: unknown; value?: unknown };

function toRaw(ad: Record<string, unknown>, pageUrl?: string): RawListing {
  const params = (Array.isArray(ad.params) ? ad.params : []) as Param[];
  const p = (key: string) => params.find((x) => x.key === key);
  const url = firstString(ad.url, pageUrl) ?? "";
  const built = firstString(p("builttype")?.normalizedValue, p("builttype")?.value)?.toLowerCase() ?? "";
  const rooms = roomsFrom(p("rooms")?.normalizedValue ?? p("rooms")?.value);
  const area = Number(firstString(p("m")?.normalizedValue, p("m")?.value)?.replace(",", ".").replace(/[^\d.]/g, ""));
  let type = "APARTMENT";
  if (url.includes("/domy/") || /dom|wolnostoj/.test(built)) type = "HOUSE";
  if (/szeregow|blizni|bliźni/.test(built)) type = "TOWNHOUSE";
  if (built.includes("loft")) type = "LOFT";
  if (type === "APARTMENT" && rooms === 1 && Number.isFinite(area) && area < 35) type = "STUDIO";
  if (/\/(dzialki|biura-lokale|garaze-parkingi|stancje-pokoje|hale-magazyny)\//.test(url)) type = "OTHER";
  return {
    title: firstString(ad.title),
    country: "Poland",
    countryCode: "PL",
    city: firstString(get(ad, "location.cityName"), get(ad, "location.city.name")),
    region: firstString(get(ad, "location.regionName"), get(ad, "location.region.name")),
    neighborhood: firstString(get(ad, "location.districtName"), get(ad, "location.district.name")),
    latitude: firstString(get(ad, "map.lat")),
    longitude: firstString(get(ad, "map.lon")),
    price: firstString(get(ad, "price.regularPrice.value"), get(ad, "price.value")),
    currency: firstString(get(ad, "price.regularPrice.currencyCode"), get(ad, "price.currency")) ?? "PLN",
    areaM2: Number.isFinite(area) ? area : undefined,
    rooms,
    floor: floorFrom(p("floor_select")?.normalizedValue ?? p("floor_select")?.value),
    propertyType: type,
    offerType: /wynajem|\/wynajem\/|rent/.test(url) ? "rent" : "sale",
    imageUrls: cleanImages((Array.isArray(ad.photos) ? ad.photos : []).map((ph) => (typeof ph === "string" ? ph : get(ph, "link") ?? get(ph, "url")))),
    sourceName: SOURCE,
    sourceUrl: url.split("?")[0] || undefined,
    sourceListingId: firstString(ad.id),
  };
}

export function parseOlxListing(html: string, url: string): RawListing | null {
  const state = extractOlxState(html);
  if (!state) return null;
  const ad = (get(state, "ad.ad") as Record<string, unknown> | undefined) ?? findObject(state, (o) => Array.isArray(o.photos) && Array.isArray(o.params));
  return ad ? toRaw(ad, url) : null;
}

export function parseOlxSearch(html: string): RawListing[] {
  const state = extractOlxState(html);
  if (!state) return [];
  const ads = (get(state, "listing.listing.ads") as Array<Record<string, unknown>> | undefined) ?? findArray(state, (o) => Array.isArray(o.photos) && Array.isArray(o.params));
  return (ads ?? []).map((ad) => toRaw(ad));
}

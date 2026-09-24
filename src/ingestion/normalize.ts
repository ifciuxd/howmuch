import type { PropertyTypeKey } from "@/game/products/homes";
import { slugify } from "@/lib/format";
import { estimateDifficulty } from "./difficulty";
import type { NormalizedProperty, RawListing } from "./types";

const COUNTRY_CODES: Record<string, string> = {
  poland: "PL", polska: "PL",
  spain: "ES", espana: "ES", "españa": "ES",
  germany: "DE", deutschland: "DE", niemcy: "DE",
  france: "FR", francja: "FR",
  "united kingdom": "GB", uk: "GB", "great britain": "GB", england: "GB",
  italy: "IT", italia: "IT", wlochy: "IT", "włochy": "IT",
  "united states": "US", usa: "US", "united states of america": "US",
  "united arab emirates": "AE", uae: "AE",
  portugal: "PT", netherlands: "NL", austria: "AT", czechia: "CZ", "czech republic": "CZ",
};

const PROPERTY_TYPES: Record<string, PropertyTypeKey> = {
  apartment: "APARTMENT", flat: "APARTMENT", mieszkanie: "APARTMENT", apartament: "APARTMENT", condo: "APARTMENT",
  studio: "STUDIO", kawalerka: "STUDIO",
  penthouse: "PENTHOUSE",
  loft: "LOFT",
  house: "HOUSE", dom: "HOUSE", detached: "HOUSE", "dom wolnostojący": "HOUSE",
  townhouse: "TOWNHOUSE", terraced: "TOWNHOUSE", segment: "TOWNHOUSE", szeregowiec: "TOWNHOUSE", "bliźniak": "TOWNHOUSE",
  villa: "VILLA", willa: "VILLA", rezydencja: "VILLA",
};

/** Alternative spellings → the slug used by imports, so one city never splits in two. */
const CITY_SLUG_ALIASES: Record<string, string> = {
  warsaw: "warszawa",
  cracow: "krakow",
  danzig: "gdansk",
  breslau: "wroclaw",
  posen: "poznan",
  nyc: "new-york",
  "new-york-city": "new-york",
};

export function canonicalCitySlug(city: string): string {
  const slug = slugify(city);
  return CITY_SLUG_ALIASES[slug] ?? slug;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

/** "1 250 000 zł" → 1250000 ; "54,2" → 54.2 */
export function toNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).replace(/[\s  ]/g, "").replace(/[^\d.,-]/g, "");
  if (!s) return null;
  // "1.250.000" or "1,250,000" (grouping) vs "54,2" (decimal comma)
  const commas = (s.match(/,/g) ?? []).length;
  const dots = (s.match(/\./g) ?? []).length;
  if (commas > 1) s = s.replace(/,/g, "");
  else if (dots > 1) s = s.replace(/\./g, "").replace(",", ".");
  else if (commas === 1 && dots === 1) s = s.indexOf(",") < s.indexOf(".") ? s.replace(",", "") : s.replace(".", "").replace(",", ".");
  else if (commas === 1) s = /,\d{3}$/.test(s) && !/^0,/.test(s) ? s.replace(",", "") : s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toInt(v: unknown): number | null {
  const n = toNumber(v);
  return n == null ? null : Math.round(n);
}

export function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return ["true", "yes", "y", "1", "tak", "x"].includes(s);
}

export function splitImageUrls(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  const s = str(v);
  if (!s) return [];
  return s
    .split(/[|\n;]+|\s+(?=https?:\/\/)/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function normalizeCountryCode(country: string | null, code: string | null): string | null {
  if (code && /^[a-z]{2}$/i.test(code)) return code.toUpperCase();
  if (!country) return null;
  return COUNTRY_CODES[country.trim().toLowerCase()] ?? null;
}

export function normalizePropertyType(v: unknown): PropertyTypeKey | null {
  const s = str(v)?.toLowerCase();
  if (!s) return null;
  const upper = s.toUpperCase();
  if (["APARTMENT", "STUDIO", "PENTHOUSE", "LOFT", "HOUSE", "TOWNHOUSE", "VILLA"].includes(upper)) return upper as PropertyTypeKey;
  return PROPERTY_TYPES[s] ?? null;
}

function normalizeOfferType(v: unknown): "sale" | "rent" | null {
  const s = str(v)?.toLowerCase();
  if (!s) return null;
  if (/(rent|wynaj|let|miete|alquiler|location)/.test(s)) return "rent";
  if (/(sale|sell|sprzeda|kauf|venta|vente)/.test(s)) return "sale";
  return null;
}

/**
 * Loose → strict shape. Never throws; missing/invalid values become null and
 * are reported by validation.
 */
export function normalizeListing(raw: RawListing): NormalizedProperty {
  const city = str(raw.city) ?? "";
  const country = str(raw.country) ?? "";
  const countryCode = normalizeCountryCode(country, str(raw.countryCode)) ?? "";
  const areaM2 = toNumber(raw.areaM2);
  // Unknown types (plots, garages, offices…) are kept as-is so validation rejects them visibly.
  const typeGiven = str(raw.propertyType);
  const propertyType =
    normalizePropertyType(typeGiven) ??
    (typeGiven ? (typeGiven.toUpperCase() as PropertyTypeKey) : areaM2 != null && areaM2 < 32 ? "STUDIO" : "APARTMENT");
  const rooms = toInt(raw.rooms);
  const yearBuilt = toInt(raw.yearBuilt);
  const price = toInt(raw.price) ?? 0;
  const explicitDifficulty = toInt(raw.difficulty);
  const n: NormalizedProperty = {
    title: str(raw.title) ?? [propertyType.charAt(0) + propertyType.slice(1).toLowerCase(), city].filter(Boolean).join(" in "),
    country: country || countryCode,
    countryCode,
    city,
    citySlug: canonicalCitySlug(city),
    region: str(raw.region),
    neighborhood: str(raw.neighborhood),
    latitude: toNumber(raw.latitude),
    longitude: toNumber(raw.longitude),
    price,
    currency: (str(raw.currency) ?? "").toUpperCase().replace("ZŁ", "PLN").replace("ZL", "PLN"),
    areaM2: areaM2 != null ? Math.round(areaM2 * 10) / 10 : null,
    rooms,
    bathrooms: toInt(raw.bathrooms),
    propertyType,
    floor: toInt(raw.floor),
    yearBuilt,
    description: str(raw.description),
    imageUrls: splitImageUrls(raw.imageUrls),
    sourceName: str(raw.sourceName) ?? "manual",
    sourceUrl: str(raw.sourceUrl),
    sourceListingId: str(raw.sourceListingId),
    difficulty: 5,
    rightsVerified: toBool(raw.rightsVerified),
    imageUsageRights: str(raw.imageUsageRights),
    offerType: normalizeOfferType(raw.offerType),
  };
  n.difficulty = explicitDifficulty ?? estimateDifficulty(n);
  return n;
}

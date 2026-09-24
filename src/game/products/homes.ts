import { pricePerM2 } from "@/lib/format";

/**
 * HOWMUCH? HOMES — product definition.
 *
 * Decides which facts players see before guessing (enough to reason, never
 * enough to solve) and what extra context is revealed afterwards.
 */

export const HOMES_PRODUCT = {
  key: "HOMES" as const,
  name: "HOWMUCH? HOMES",
  itemNoun: "home",
  itemNounPlural: "homes",
  nextLabel: "NEXT HOME",
  unitLabel: "m²",
};

export type PropertyTypeKey = "APARTMENT" | "STUDIO" | "PENTHOUSE" | "LOFT" | "HOUSE" | "TOWNHOUSE" | "VILLA";

export const PROPERTY_TYPE_LABELS: Record<PropertyTypeKey, string> = {
  APARTMENT: "Apartment",
  STUDIO: "Studio",
  PENTHOUSE: "Penthouse",
  LOFT: "Loft",
  HOUSE: "House",
  TOWNHOUSE: "Townhouse",
  VILLA: "Villa",
};

/** Shown before the guess. No price, address, coordinates, source or neighbourhood. */
export interface HomeFacts {
  city: string;
  citySlug: string;
  country: string;
  countryCode: string;
  currency: string;
  areaM2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  propertyType: PropertyTypeKey;
  floor: number | null;
  images: string[];
}

/** Extra context unlocked once the guess is locked in. */
export interface HomeRevealContext {
  title: string;
  neighborhood: string | null;
  yearBuilt: number | null;
  insight: string | null;
  insightIsAi: boolean;
}

export interface PropertyLike {
  city: string;
  country: string;
  countryCode: string;
  currency: string;
  areaM2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  propertyType: PropertyTypeKey;
  floor: number | null;
  imageUrls: string[];
  cityRef?: { slug: string; name?: string } | null;
}

export function toHomeFacts(p: PropertyLike & { citySlug?: string }): HomeFacts {
  return {
    city: p.cityRef?.name ?? p.city,
    citySlug: p.cityRef?.slug ?? p.citySlug ?? "",
    country: p.country,
    countryCode: p.countryCode,
    currency: p.currency,
    areaM2: p.areaM2,
    rooms: p.rooms,
    bathrooms: p.bathrooms,
    propertyType: p.propertyType,
    floor: p.floor,
    images: p.imageUrls,
  };
}

export function floorLabel(floor: number | null | undefined, type?: PropertyTypeKey): string | null {
  if (floor == null) return null;
  if (type === "HOUSE" || type === "VILLA" || type === "TOWNHOUSE") return null;
  if (floor === 0) return "Ground floor";
  if (floor < 0) return "Lower ground";
  const suffix = floor % 10 === 1 && floor % 100 !== 11 ? "st" : floor % 10 === 2 && floor % 100 !== 12 ? "nd" : floor % 10 === 3 && floor % 100 !== 13 ? "rd" : "th";
  return `${floor}${suffix} floor`;
}

/** "78 m² · 3 rooms" */
export function primaryFactsLine(f: Pick<HomeFacts, "areaM2" | "rooms">): string {
  const parts: string[] = [];
  if (f.areaM2) parts.push(`${Number.isInteger(f.areaM2) ? f.areaM2 : f.areaM2.toFixed(1)} m²`);
  if (f.rooms) parts.push(`${f.rooms} ${f.rooms === 1 ? "room" : "rooms"}`);
  return parts.join(" · ");
}

/** "Apartment · 4th floor · 2 baths" */
export function secondaryFactsLine(f: Pick<HomeFacts, "propertyType" | "floor" | "bathrooms">): string {
  const parts: string[] = [PROPERTY_TYPE_LABELS[f.propertyType]];
  const fl = floorLabel(f.floor, f.propertyType);
  if (fl) parts.push(fl);
  if (f.bathrooms) parts.push(`${f.bathrooms} ${f.bathrooms === 1 ? "bath" : "baths"}`);
  return parts.join(" · ");
}

export function homeUnitValue(price: number, areaM2: number | null): number | null {
  const v = pricePerM2(price, areaM2);
  return v == null ? null : Math.round(v);
}

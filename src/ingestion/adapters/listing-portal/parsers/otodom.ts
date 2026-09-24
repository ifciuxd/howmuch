import type { RawListing } from "../../../types";
import { cleanImages, extractNextData, findArray, findObject, firstString, floorFrom, get, roomsFrom } from "./common";

/**
 * otodom.pl — reads the page's embedded Next.js data (`__NEXT_DATA__`).
 * Only facts needed for the game are taken: no descriptions, no agent or owner data.
 */

const SOURCE = "otodom.pl";

function mapCategory(name: string | undefined, rooms?: number, area?: number): string | undefined {
  const s = name?.toUpperCase();
  if (!s) return undefined;
  if (s.includes("FLAT") || s === "MIESZKANIE" || s === "APARTMENT") return rooms === 1 && area != null && area < 35 ? "STUDIO" : "APARTMENT";
  if (s.includes("HOUSE") || s === "DOM") return "HOUSE";
  if (s.includes("STUDIO")) return "STUDIO";
  // Plots, rooms, garages, commercial… are not homes we can play.
  return s;
}

function offerType(v: string | undefined): string | undefined {
  const s = v?.toUpperCase();
  if (!s) return undefined;
  if (s.includes("RENT") || s.includes("WYNAJEM")) return "rent";
  if (s.includes("SELL") || s.includes("SPRZEDAZ") || s.includes("SALE")) return "sale";
  return undefined;
}

function imageList(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return cleanImages(
    images.map((i) => (typeof i === "string" ? i : firstString(get(i, "large"), get(i, "medium"), get(i, "url"), get(i, "small")))),
  );
}

export function parseOtodomListing(html: string, url: string): RawListing | null {
  const data = extractNextData(html);
  if (!data) return null;
  const ad = findObject(data, (o) => Array.isArray(o.images) && (typeof o.target === "object" || Array.isArray(o.characteristics)));
  if (!ad) return null;
  const target = (ad.target ?? {}) as Record<string, unknown>;
  const chars = (Array.isArray(ad.characteristics) ? ad.characteristics : []) as Array<Record<string, unknown>>;
  const ch = (key: string) => chars.find((c) => c.key === key);

  const area = Number(firstString(target.Area, ch("m")?.value));
  const rooms = roomsFrom(target.Rooms_num ?? ch("rooms_num")?.value);
  return {
    title: firstString(ad.title),
    country: "Poland",
    countryCode: "PL",
    city: firstString(get(ad, "location.address.city.name"), target.City),
    region: firstString(get(ad, "location.address.province.name"), target.Province),
    neighborhood: firstString(get(ad, "location.address.district.name"), target.District),
    latitude: firstString(get(ad, "location.coordinates.latitude")),
    longitude: firstString(get(ad, "location.coordinates.longitude")),
    price: firstString(target.Price, ch("price")?.value, get(ad, "price.value")),
    currency: firstString(ch("price")?.currency, get(ad, "price.currency")) ?? "PLN",
    areaM2: Number.isFinite(area) ? area : undefined,
    rooms,
    bathrooms: firstString(target.Bathrooms_num, ch("bathrooms_num")?.value),
    floor: floorFrom(target.Floor_no ?? ch("floor_no")?.value),
    yearBuilt: firstString(target.Build_year, ch("build_year")?.value),
    propertyType: mapCategory(firstString(get(ad, "adCategory.name"), target.ProperType), rooms, area),
    offerType: offerType(firstString(get(ad, "adCategory.type"), target.OfferType)),
    imageUrls: imageList(ad.images),
    sourceName: SOURCE,
    sourceUrl: canonical(url),
    sourceListingId: firstString(ad.id, ad.publicId),
  };
}

export function parseOtodomSearch(html: string): RawListing[] {
  const data = extractNextData(html);
  if (!data) return [];
  const items = findArray(data, (o) => typeof o.slug === "string" && (o.totalPrice != null || o.areaInSquareMeters != null));
  if (!items) return [];
  return items.map((it) => {
    const rooms = roomsFrom(it.roomsNumber);
    const area = Number(firstString(it.areaInSquareMeters));
    return {
      title: firstString(it.title),
      country: "Poland",
      countryCode: "PL",
      city: firstString(get(it, "location.address.city.name")),
      region: firstString(get(it, "location.address.province.name")),
      neighborhood: firstString(get(it, "location.address.district.name")),
      price: firstString(get(it, "totalPrice.value")),
      currency: firstString(get(it, "totalPrice.currency")) ?? "PLN",
      areaM2: Number.isFinite(area) ? area : undefined,
      rooms,
      floor: floorFrom(it.floorNumber),
      propertyType: mapCategory(firstString(it.estate), rooms, area),
      offerType: offerType(firstString(it.transaction)),
      imageUrls: imageList(it.images),
      sourceName: SOURCE,
      sourceUrl: `https://www.otodom.pl/pl/oferta/${String(it.slug)}`,
      sourceListingId: firstString(it.id),
    } satisfies RawListing;
  });
}

function canonical(url: string): string {
  const u = new URL(url);
  u.search = "";
  u.hash = "";
  return u.toString();
}

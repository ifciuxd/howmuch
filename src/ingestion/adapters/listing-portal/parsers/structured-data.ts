import type { RawListing } from "../../../types";
import { cleanImages, extractJsonLd, firstString, get, metaContent } from "./common";

/**
 * Fallback for any listing page that publishes schema.org JSON-LD and/or
 * OpenGraph tags. Works across many portals without site-specific code.
 */

const HOME_TYPES = ["Apartment", "House", "SingleFamilyResidence", "Residence", "Accommodation", "RealEstateListing", "Product", "Offer"];

function types(o: unknown): string[] {
  const t = get(o, "@type");
  return Array.isArray(t) ? t.map(String) : t ? [String(t)] : [];
}

function images(v: unknown): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return cleanImages(arr.map((x) => (typeof x === "string" ? x : firstString(get(x, "url"), get(x, "contentUrl")))));
}

export function parseStructuredData(html: string, url: string): RawListing | null {
  const blocks = extractJsonLd(html).filter((b) => types(b).some((t) => HOME_TYPES.includes(t)));
  const main = blocks.find((b) => get(b, "offers") || get(b, "price")) ?? blocks[0];
  const offers = main ? (Array.isArray(get(main, "offers")) ? (get(main, "offers") as unknown[])[0] : get(main, "offers")) : undefined;
  const about = main ? get(main, "about") ?? get(main, "itemOffered") ?? main : undefined;

  const ogImages = metaContent(html, "og:image");
  const price = firstString(get(offers, "price"), get(main, "price"), metaContent(html, "product:price:amount")[0], metaContent(html, "og:price:amount")[0]);
  const currency = firstString(get(offers, "priceCurrency"), get(main, "priceCurrency"), metaContent(html, "product:price:currency")[0], metaContent(html, "og:price:currency")[0]);
  const imageUrls = [...images(get(main, "image")), ...images(get(about, "image")), ...cleanImages(ogImages)];

  if (!price && imageUrls.length === 0) return null;
  const host = new URL(url).hostname.replace(/^www\./, "");
  const typeName = types(about).find((t) => ["Apartment", "House", "SingleFamilyResidence"].includes(t));
  return {
    title: firstString(get(main, "name"), metaContent(html, "og:title")[0]),
    city: firstString(get(about, "address.addressLocality"), get(main, "address.addressLocality")),
    region: firstString(get(about, "address.addressRegion"), get(main, "address.addressRegion")),
    country: firstString(get(about, "address.addressCountry.name"), get(about, "address.addressCountry")),
    countryCode: firstString(get(about, "address.addressCountry")),
    latitude: firstString(get(about, "geo.latitude")),
    longitude: firstString(get(about, "geo.longitude")),
    price,
    currency,
    areaM2: firstString(get(about, "floorSize.value"), get(main, "floorSize.value")),
    rooms: firstString(get(about, "numberOfRooms"), get(main, "numberOfRooms")),
    bathrooms: firstString(get(about, "numberOfBathroomsTotal"), get(main, "numberOfBathroomsTotal")),
    yearBuilt: firstString(get(about, "yearBuilt")),
    propertyType: typeName === "Apartment" ? "APARTMENT" : typeName ? "HOUSE" : undefined,
    imageUrls: Array.from(new Set(imageUrls)).slice(0, 12),
    sourceName: host,
    sourceUrl: url.split("#")[0],
  };
}

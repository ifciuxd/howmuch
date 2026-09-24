import type { RawListing } from "../../src/ingestion/types";

/**
 * Deterministic fixture homes for automated tests and offline UI work.
 * Marked isDemo; images come from tests/fixtures/fixture-image-server.mjs.
 */

const IMG = process.env.FIXTURE_IMAGE_BASE ?? "http://localhost:4555/img";

const CITIES = [
  { city: "Gdańsk", country: "Poland", countryCode: "PL", currency: "PLN", perM2: 14500 },
  { city: "Warszawa", country: "Poland", countryCode: "PL", currency: "PLN", perM2: 18500 },
  { city: "Kraków", country: "Poland", countryCode: "PL", currency: "PLN", perM2: 16800 },
  { city: "Wrocław", country: "Poland", countryCode: "PL", currency: "PLN", perM2: 13900 },
  { city: "Berlin", country: "Germany", countryCode: "DE", currency: "EUR", perM2: 6200 },
  { city: "Barcelona", country: "Spain", countryCode: "ES", currency: "EUR", perM2: 5100 },
];

const TYPES = ["APARTMENT", "APARTMENT", "STUDIO", "APARTMENT", "PENTHOUSE", "HOUSE"];
const AREAS = [54, 71, 29, 88, 142, 165];

export function fixtureListings(): RawListing[] {
  const out: RawListing[] = [];
  CITIES.forEach((c, ci) => {
    TYPES.forEach((type, ti) => {
      const id = `fx-${ci}-${ti}`;
      const area = AREAS[ti] + ci;
      const premium = type === "PENTHOUSE" ? 1.45 : type === "HOUSE" ? 0.9 : type === "STUDIO" ? 1.15 : 1 + ((ci + ti) % 3) * 0.08;
      const price = Math.round((area * c.perM2 * premium) / 1000) * 1000;
      out.push({
        title: `${type.toLowerCase()} fixture ${ci}-${ti}`,
        country: c.country,
        countryCode: c.countryCode,
        city: c.city,
        price,
        currency: c.currency,
        areaM2: area,
        rooms: type === "STUDIO" ? 1 : Math.max(2, Math.round(area / 28)),
        bathrooms: area > 100 ? 2 : 1,
        propertyType: type,
        floor: type === "HOUSE" ? undefined : (ci + ti) % 7,
        yearBuilt: 1905 + ((ci * 17 + ti * 23) % 115),
        imageUrls: [1, 2, 3, 4].map((n) => `${IMG}/${id}/${n}.svg`),
        sourceName: "test-fixture",
        sourceListingId: id,
        difficulty: 2 + ((ci + ti * 2) % 8),
        rightsVerified: true,
        imageUsageRights: "Test fixture (generated placeholder)",
      });
    });
  });
  return out;
}

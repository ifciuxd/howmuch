/**
 * Editorial metadata for cities. Cities are created automatically on import —
 * this only adds display names, blurbs and ordering. Slugs must match imports
 * (Polish portals use Polish names: "Warszawa" → "warszawa").
 */
export const CITY_SEED: Array<{ slug: string; name: string; country: string; countryCode: string; region?: string; blurb: string; featured?: boolean; sortOrder: number }> = [
  { slug: "gdansk", name: "Gdańsk", country: "Poland", countryCode: "PL", region: "Pomorskie", blurb: "Hanseatic gables, shipyard lofts and a sea breeze that costs extra.", featured: true, sortOrder: 1 },
  { slug: "warszawa", name: "Warsaw", country: "Poland", countryCode: "PL", region: "Mazowieckie", blurb: "Glass towers, pre-war tenements and the priciest square metres in Poland.", featured: true, sortOrder: 2 },
  { slug: "krakow", name: "Kraków", country: "Poland", countryCode: "PL", region: "Małopolskie", blurb: "Kamienice, courtyards and a market that never sleeps.", featured: true, sortOrder: 3 },
  { slug: "wroclaw", name: "Wrocław", country: "Poland", countryCode: "PL", region: "Dolnośląskie", blurb: "Islands, bridges and a building boom.", featured: true, sortOrder: 4 },
  { slug: "sopot", name: "Sopot", country: "Poland", countryCode: "PL", region: "Pomorskie", blurb: "Small town, big sea views, bigger prices.", sortOrder: 5 },
  { slug: "gdynia", name: "Gdynia", country: "Poland", countryCode: "PL", region: "Pomorskie", blurb: "Modernist port city with a waterfront skyline.", sortOrder: 6 },
  { slug: "poznan", name: "Poznań", country: "Poland", countryCode: "PL", region: "Wielkopolskie", blurb: "Colourful old town, solid value.", sortOrder: 7 },
  { slug: "lodz", name: "Łódź", country: "Poland", countryCode: "PL", region: "Łódzkie", blurb: "Red-brick lofts in former textile mills.", sortOrder: 8 },
  { slug: "zakopane", name: "Zakopane", country: "Poland", countryCode: "PL", region: "Małopolskie", blurb: "Mountain chalets where views are priced per peak.", sortOrder: 9 },
  { slug: "barcelona", name: "Barcelona", country: "Spain", countryCode: "ES", blurb: "Eixample balconies and Mediterranean light.", sortOrder: 20 },
  { slug: "madrid", name: "Madrid", country: "Spain", countryCode: "ES", blurb: "Iron balconies, high ceilings, late dinners.", sortOrder: 21 },
  { slug: "berlin", name: "Berlin", country: "Germany", countryCode: "DE", blurb: "Altbau ceilings and Hinterhof calm.", sortOrder: 22 },
  { slug: "paris", name: "Paris", country: "France", countryCode: "FR", blurb: "Haussmann stone, herringbone floors, tiny lifts.", sortOrder: 23 },
  { slug: "london", name: "London", country: "United Kingdom", countryCode: "GB", blurb: "Terraces, mews and pounds per square foot.", sortOrder: 24 },
  { slug: "new-york", name: "New York", country: "United States", countryCode: "US", blurb: "Brownstones, lofts and doorman buildings.", sortOrder: 25 },
];

export const SOURCE_SEED = [
  { name: "otodom.pl", kind: "LISTING_PORTAL" as const, description: "Public listings on otodom.pl", license: "Displayed from source with attribution and link-back; not re-hosted." },
  { name: "olx.pl", kind: "LISTING_PORTAL" as const, description: "Public listings on olx.pl", license: "Displayed from source with attribution and link-back; not re-hosted." },
  { name: "manual", kind: "MANUAL_CSV" as const, description: "Manually curated homes (admin / CSV)", license: "Per-row imageUsageRights" },
];

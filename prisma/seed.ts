/**
 * Base seed: editorial city metadata + known sources.
 * Homes themselves come from real listings via `npm run import:listings`
 * or the admin CSV import — the seed never invents properties.
 */
import "dotenv/config";
import { db } from "../src/database/client";
import { CITY_SEED, SOURCE_SEED } from "./data/cities";

async function main() {
  for (const c of CITY_SEED) {
    await db.city.upsert({
      where: { slug: c.slug },
      update: { name: c.name, country: c.country, countryCode: c.countryCode, region: c.region, blurb: c.blurb, featured: c.featured ?? false, sortOrder: c.sortOrder },
      create: { slug: c.slug, name: c.name, country: c.country, countryCode: c.countryCode, region: c.region, blurb: c.blurb, featured: c.featured ?? false, sortOrder: c.sortOrder },
    });
  }
  for (const s of SOURCE_SEED) {
    await db.propertySource.upsert({ where: { name: s.name }, update: { description: s.description, license: s.license }, create: s });
  }
  const homes = await db.property.count();
  console.log(`Seeded ${CITY_SEED.length} cities and ${SOURCE_SEED.length} sources. Homes in database: ${homes}.`);
  if (homes === 0) console.log("Next: npm run import:listings -- --dry-run   (then without --dry-run) to load real homes.");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });

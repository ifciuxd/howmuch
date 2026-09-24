/** Load deterministic fixture homes (tests / offline UI work):  npm run db:fixtures */
import "dotenv/config";
import { db } from "../src/database/client";
import { runImport } from "../src/ingestion/persist";
import { fixtureListings } from "../tests/fixtures/fixture-properties";

async function main() {
  const report = await runImport(fixtureListings(), { source: "fixtures", sourceKind: "DEMO" });
  await db.property.updateMany({ where: { sourceName: "test-fixture" }, data: { isDemo: true } });
  console.log(`Fixtures: inserted ${report.inserted}, duplicates ${report.duplicates}, invalid ${report.invalid}`);
  for (const e of report.errors) console.log(`  row ${e.row}: ${e.message}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });

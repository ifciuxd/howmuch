/**
 * Import real listings from public portal pages.
 *
 *   npm run import:listings -- --dry-run                 # all sources in prisma/data/listing-sources.ts, print only
 *   npm run import:listings -- --limit 8                 # import up to 8 homes per search page
 *   npm run import:listings -- https://www.otodom.pl/pl/oferta/...   # specific listing or search URLs
 *   npm run import:listings -- --follow                  # open each listing for fuller facts (more requests)
 *
 * Polite by design: robots.txt respected, ≥4 s between requests per host,
 * honest User-Agent, stops on 403/429/captcha. Images are hotlinked, not copied.
 */
import "dotenv/config";
import { collectFromPortals } from "../src/ingestion/adapters/listing-portal/portal-adapter";
import { PoliteFetcher } from "../src/ingestion/adapters/listing-portal/polite-fetch";
import { processRecords } from "../src/ingestion/pipeline";
import { LISTING_SOURCES } from "../prisma/data/listing-sources";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const follow = args.includes("--follow");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 8;
  const urls = args.filter((a, i) => /^https?:\/\//.test(a) && args[i - 1] !== "--limit");
  const targets = urls.length ? urls : LISTING_SOURCES.flatMap((s) => s.urls);

  const contact = process.env.IMPORTER_CONTACT || `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/about#sources`;
  const fetcher = new PoliteFetcher({ contact });
  console.log(`HOWMUCH? listing import — ${targets.length} page(s), up to ${limit} homes per search page${dryRun ? " (dry run)" : ""}\n`);

  const { records, problems } = await collectFromPortals({
    urls: targets,
    perSearchLimit: limit,
    followListings: follow,
    fetcher,
    onProgress: (m) => console.log(`  → ${m}`),
  });

  if (dryRun) {
    const { report } = processRecords("listing-portal", records, { dryRun: true });
    for (const p of report.preview) {
      const x = p.property;
      console.log(`  ✓ ${x.city.padEnd(12)} ${String(x.price).padStart(10)} ${x.currency}  ${x.areaM2 ?? "?"} m²  ${x.rooms ?? "?"} rooms  ${x.imageUrls.length} photos  ${x.sourceUrl}`);
    }
    printSummary(report, problems);
    return;
  }

  const { runImport } = await import("../src/ingestion/persist");
  const report = await runImport(records, { source: "listing-portal", sourceKind: "LISTING_PORTAL" });
  printSummary(report, problems);
  const { db } = await import("../src/database/client");
  await db.$disconnect();
}

function printSummary(
  report: { total: number; valid: number; invalid: number; duplicates: number; inserted: number; errors: Array<{ row: number; message: string }> },
  problems: Array<{ url: string; message: string }>,
) {
  console.log(`\nFound ${report.total} · valid ${report.valid} · invalid ${report.invalid} · duplicates ${report.duplicates} · inserted ${report.inserted}`);
  for (const e of report.errors.slice(0, 30)) console.log(`  ✗ row ${e.row}: ${e.message}`);
  for (const p of problems) console.log(`  ! ${p.url}\n    ${p.message}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

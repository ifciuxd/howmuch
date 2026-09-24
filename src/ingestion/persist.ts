import { db, type SourceKind } from "@/database/client";
import { countryName } from "@/lib/format";
import { processRecords } from "./pipeline";
import type { ImportReport, NormalizedProperty, RawListing } from "./types";
import { dedupeKey } from "./validate";

/**
 * Database side of the pipeline. Loads existing identities for duplicate
 * detection, writes accepted rows, and records an audit log entry.
 */

export interface ImportOptions {
  source: string;
  sourceKind: SourceKind;
  dryRun?: boolean;
  actorId?: string | null;
  defaults?: Partial<RawListing>;
  /** Imported rows go live immediately (true) or wait for admin review (false). */
  activate?: boolean;
}

async function existingKeys(): Promise<Set<string>> {
  const rows = await db.property.findMany({
    select: { sourceName: true, sourceListingId: true, sourceUrl: true, price: true, areaM2: true, rooms: true, imageUrls: true, cityRef: { select: { slug: true } } },
  });
  return new Set(
    rows.map((r) =>
      dedupeKey({ ...r, citySlug: r.cityRef.slug, imageUrls: r.imageUrls }),
    ),
  );
}

export async function ensureCity(p: Pick<NormalizedProperty, "city" | "citySlug" | "country" | "countryCode" | "region">) {
  return db.city.upsert({
    where: { slug: p.citySlug },
    update: {},
    create: {
      slug: p.citySlug,
      name: p.city,
      country: p.country || countryName(p.countryCode),
      countryCode: p.countryCode,
      region: p.region,
    },
  });
}

export async function ensureSource(name: string, kind: SourceKind) {
  return db.propertySource.upsert({ where: { name }, update: {}, create: { name, kind } });
}

export async function runImport(records: RawListing[], opts: ImportOptions): Promise<ImportReport> {
  const keys = await existingKeys();
  const { report, accepted } = processRecords(opts.source, records, { existingKeys: keys, dryRun: opts.dryRun, defaults: opts.defaults });
  if (opts.dryRun) return report;

  for (const { property: p } of accepted) {
    const city = await ensureCity(p);
    const source = await ensureSource(p.sourceName, opts.sourceKind);
    await db.property.create({
      data: {
        title: p.title,
        country: city.country,
        countryCode: p.countryCode,
        city: city.name,
        cityId: city.id,
        region: p.region,
        neighborhood: p.neighborhood,
        latitude: p.latitude,
        longitude: p.longitude,
        price: p.price,
        currency: p.currency,
        areaM2: p.areaM2,
        rooms: p.rooms,
        bathrooms: p.bathrooms,
        propertyType: p.propertyType,
        floor: p.floor,
        yearBuilt: p.yearBuilt,
        description: p.description,
        imageUrls: p.imageUrls,
        sourceName: p.sourceName,
        sourceUrl: p.sourceUrl,
        sourceListingId: p.sourceListingId,
        sourceId: source.id,
        difficulty: p.difficulty,
        rightsVerified: p.rightsVerified,
        imageUsageRights: p.imageUsageRights,
        active: opts.activate ?? true,
        lastCheckedAt: opts.sourceKind === "LISTING_PORTAL" ? new Date() : null,
      },
    });
    report.inserted++;
  }

  await db.adminAuditLog.create({
    data: {
      actorId: opts.actorId ?? null,
      action: "property.import",
      entityType: "Property",
      details: {
        source: opts.source,
        total: report.total,
        inserted: report.inserted,
        invalid: report.invalid,
        duplicates: report.duplicates,
      },
    },
  });
  return report;
}

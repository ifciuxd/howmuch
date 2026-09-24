import { db, type Prisma } from "@/database/client";
import { segmentByGroup } from "@/game/selection";
import type { SelectableItem } from "@/game/types";

/**
 * Loads the playable inventory in the compact shape the selector needs.
 * Only these attributes leave the database here — never prices to the client.
 */

export const BROKEN_IMAGE_THRESHOLD = 5;

export const PLAYABLE_WHERE: Prisma.PropertyWhereInput = {
  active: true,
  imageUrls: { isEmpty: false },
  brokenImageReports: { lt: BROKEN_IMAGE_THRESHOLD },
  price: { gt: 0 },
};

export interface PoolItem extends SelectableItem {
  price: number;
}

export async function loadPool(filter: { citySlug?: string; countryCode?: string; excludeIds?: string[] } = {}): Promise<PoolItem[]> {
  const rows = await db.property.findMany({
    where: {
      ...PLAYABLE_WHERE,
      ...(filter.citySlug ? { cityRef: { slug: filter.citySlug } } : {}),
      ...(filter.countryCode ? { countryCode: filter.countryCode } : {}),
      ...(filter.excludeIds?.length ? { id: { notIn: filter.excludeIds } } : {}),
    },
    select: { id: true, price: true, countryCode: true, propertyType: true, difficulty: true, cityRef: { select: { slug: true } } },
    take: 5000,
  });
  const segments = segmentByGroup(rows.map((r) => ({ id: r.id, group: r.cityRef.slug, price: r.price })));
  return rows.map((r) => ({
    id: r.id,
    price: r.price,
    group: r.cityRef.slug,
    region: r.countryCode,
    kind: r.propertyType,
    difficulty: r.difficulty,
    segment: segments.get(r.id) ?? "mid",
  }));
}

export interface PlayableCity {
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  homes: number;
  heroImageUrl: string | null;
  blurb: string | null;
  featured: boolean;
}

/** Cities with enough homes for a full game. New cities appear automatically after import. */
export async function playableCities(minHomes = 5): Promise<PlayableCity[]> {
  const counts = await db.property.groupBy({ by: ["cityId"], where: PLAYABLE_WHERE, _count: { _all: true } });
  const ids = counts.filter((c) => c._count._all >= minHomes).map((c) => c.cityId);
  if (ids.length === 0) return [];
  const cities = await db.city.findMany({
    where: { id: { in: ids } },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { properties: { where: PLAYABLE_WHERE, select: { imageUrls: true }, take: 1, orderBy: { difficulty: "asc" } } },
  });
  const byId = new Map(counts.map((c) => [c.cityId, c._count._all]));
  return cities.map((c) => ({
    slug: c.slug,
    name: c.name,
    country: c.country,
    countryCode: c.countryCode,
    homes: byId.get(c.id) ?? 0,
    heroImageUrl: c.heroImageUrl ?? c.properties[0]?.imageUrls[0] ?? null,
    blurb: c.blurb,
    featured: c.featured,
  }));
}

export async function playableCountries(minHomes = 5): Promise<Array<{ code: string; name: string; homes: number; cities: number }>> {
  const rows = await db.property.groupBy({ by: ["countryCode", "country"], where: PLAYABLE_WHERE, _count: { _all: true } });
  const cityCounts = await db.property.groupBy({ by: ["countryCode", "cityId"], where: PLAYABLE_WHERE });
  const merged = new Map<string, { code: string; name: string; homes: number; cities: number }>();
  for (const r of rows) {
    const m = merged.get(r.countryCode) ?? { code: r.countryCode, name: r.country, homes: 0, cities: 0 };
    m.homes += r._count._all;
    merged.set(r.countryCode, m);
  }
  for (const c of cityCounts) {
    const m = merged.get(c.countryCode);
    if (m) m.cities++;
  }
  return [...merged.values()].filter((c) => c.homes >= minHomes).sort((a, b) => b.homes - a.homes);
}

export async function playableCount(): Promise<number> {
  return db.property.count({ where: PLAYABLE_WHERE });
}

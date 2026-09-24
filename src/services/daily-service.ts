import { db, Prisma } from "@/database/client";
import { dailySeed, previousDateKey, selectDaily, utcDateKey } from "@/game/daily";
import { loadPool } from "./pool-service";

/**
 * Daily challenge lifecycle.
 *
 * The first request for a date materialises the challenge: an admin-curated one
 * if it exists, otherwise the deterministic generator (seed = "HOMES:YYYY-MM-DD").
 * Once stored it never changes, so every player gets the same five homes.
 */

const FRESHNESS_DAYS = 30;

export type DailyWithRounds = Prisma.DailyChallengeGetPayload<{ include: { rounds: { orderBy: { index: "asc" } } } }>;

export async function findDaily(dateKey: string): Promise<DailyWithRounds | null> {
  return db.dailyChallenge.findUnique({
    where: { product_date: { product: "HOMES", date: dateKey } },
    include: { rounds: { orderBy: { index: "asc" } } },
  });
}

/** Property ids used by dailies in the previous N days — avoided so days feel fresh. */
async function recentDailyPropertyIds(dateKey: string): Promise<string[]> {
  const keys: string[] = [];
  let k = dateKey;
  for (let i = 0; i < FRESHNESS_DAYS; i++) {
    k = previousDateKey(k);
    keys.push(k);
  }
  const rows = await db.dailyChallengeRound.findMany({
    where: { challenge: { product: "HOMES", date: { in: keys } } },
    select: { propertyId: true },
  });
  return rows.map((r) => r.propertyId);
}

/** Pure-ish preview used by admin: what the generator would pick for a date. */
export async function generateDailySelection(dateKey: string): Promise<string[]> {
  const recent = await recentDailyPropertyIds(dateKey);
  let pool = await loadPool({ excludeIds: recent });
  if (pool.length < 5) pool = await loadPool();
  return selectDaily(pool, dailySeed("HOMES", dateKey)).map((p) => p.id);
}

export async function getOrCreateDaily(dateKey: string = utcDateKey()): Promise<DailyWithRounds> {
  const existing = await findDaily(dateKey);
  if (existing) {
    if (existing.status !== "PUBLISHED" && dateKey <= utcDateKey()) {
      // A curated draft for a day that has arrived goes live as-is.
      await db.dailyChallenge.update({ where: { id: existing.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    }
    return existing;
  }
  const ids = await generateDailySelection(dateKey);
  try {
    return await db.dailyChallenge.create({
      data: {
        product: "HOMES",
        date: dateKey,
        status: "PUBLISHED",
        generated: true,
        publishedAt: new Date(),
        rounds: { create: ids.map((propertyId, index) => ({ index, propertyId })) },
      },
      include: { rounds: { orderBy: { index: "asc" } } },
    });
  } catch (e) {
    // Two players raced to create the same day — the other one won; use theirs.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await findDaily(dateKey);
      if (again) return again;
    }
    throw e;
  }
}

/** Save an admin-curated challenge (DRAFT or PUBLISHED). Blocked once people have played it. */
export async function saveCuratedDaily(opts: { dateKey: string; propertyIds: string[]; publish: boolean; actorId: string }) {
  if (opts.propertyIds.length !== 5 || new Set(opts.propertyIds).size !== 5) throw new Error("Pick exactly five different homes.");
  return db.$transaction(async (tx) => {
    const existing = await tx.dailyChallenge.findUnique({
      where: { product_date: { product: "HOMES", date: opts.dateKey } },
      include: { _count: { select: { games: true } } },
    });
    if (existing && existing._count.games > 0) throw new Error("People have already played this day — it can't be changed.");
    if (existing) await tx.dailyChallenge.delete({ where: { id: existing.id } });
    const saved = await tx.dailyChallenge.create({
      data: {
        product: "HOMES",
        date: opts.dateKey,
        status: opts.publish ? "PUBLISHED" : "DRAFT",
        generated: false,
        publishedAt: opts.publish ? new Date() : null,
        createdById: opts.actorId,
        rounds: { create: opts.propertyIds.map((propertyId, index) => ({ index, propertyId })) },
      },
    });
    await tx.adminAuditLog.create({
      data: {
        actorId: opts.actorId,
        action: opts.publish ? "daily.publish" : "daily.save_draft",
        entityType: "DailyChallenge",
        entityId: saved.id,
        details: { date: opts.dateKey, propertyIds: opts.propertyIds },
      },
    });
    return saved;
  });
}

/** Streak update after a completed daily. */
export function nextStreak(lastDailyDate: string | null, current: number, dateKey: string): number {
  if (lastDailyDate === dateKey) return current;
  if (lastDailyDate && lastDailyDate === previousDateKey(dateKey)) return current + 1;
  return 1;
}

/** Streak as displayed today: it only "breaks" once a full day is missed. */
export function displayStreak(lastDailyDate: string | null, current: number, today: string = utcDateKey()): number {
  if (!lastDailyDate) return 0;
  if (lastDailyDate === today || lastDailyDate === previousDateKey(today)) return current;
  return 0;
}

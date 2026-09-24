import { db, type LeaderboardScope, type Prisma } from "@/database/client";

/**
 * Leaderboards keep each player's best result per board:
 *   GLOBAL / "all"  — best Quick Play game
 *   DAILY  / date   — the (single) daily attempt
 *   CITY   / slug   — best City game
 *   COUNTRY/ code   — best Country game
 * Scores come only from server-side scoring.
 */

export const MIN_PERCENTILE_SAMPLE = 20;

type Tx = Prisma.TransactionClient;

export async function recordBest(
  tx: Tx,
  entry: { scope: LeaderboardScope; scopeKey: string; userId: string; gameId: string; score: number; accuracy: number },
): Promise<void> {
  const where = { product_scope_scopeKey_userId: { product: "HOMES" as const, scope: entry.scope, scopeKey: entry.scopeKey, userId: entry.userId } };
  const existing = await tx.leaderboardEntry.findUnique({ where });
  if (!existing) {
    await tx.leaderboardEntry.create({ data: { product: "HOMES", ...entry } });
  } else if (entry.score > existing.score || (entry.score === existing.score && entry.accuracy > existing.accuracy)) {
    await tx.leaderboardEntry.update({ where: { id: existing.id }, data: { score: entry.score, accuracy: entry.accuracy, gameId: entry.gameId } });
  }
}

export interface BoardRow {
  rank: number;
  userId: string;
  username: string;
  image: string | null;
  isGuest: boolean;
  score: number;
  accuracy: number;
}

export async function getBoard(scope: LeaderboardScope, scopeKey: string, limit = 50): Promise<BoardRow[]> {
  const rows = await db.leaderboardEntry.findMany({
    where: { product: "HOMES", scope, scopeKey, user: { bannedAt: null } },
    orderBy: [{ score: "desc" }, { accuracy: "desc" }, { createdAt: "asc" }],
    take: limit,
    select: { score: true, accuracy: true, user: { select: { id: true, username: true, image: true, isGuest: true } } },
  });
  return rows.map((r, i) => ({
    rank: i + 1,
    userId: r.user.id,
    username: r.user.username ?? "Player",
    image: r.user.image,
    isGuest: r.user.isGuest,
    score: r.score,
    accuracy: r.accuracy,
  }));
}

export async function getMyRank(scope: LeaderboardScope, scopeKey: string, userId: string): Promise<{ rank: number; score: number; accuracy: number; total: number } | null> {
  const mine = await db.leaderboardEntry.findUnique({
    where: { product_scope_scopeKey_userId: { product: "HOMES", scope, scopeKey, userId } },
  });
  if (!mine) return null;
  const [better, total] = await Promise.all([
    db.leaderboardEntry.count({
      where: {
        product: "HOMES",
        scope,
        scopeKey,
        user: { bannedAt: null },
        OR: [{ score: { gt: mine.score } }, { score: mine.score, accuracy: { gt: mine.accuracy } }],
      },
    }),
    db.leaderboardEntry.count({ where: { product: "HOMES", scope, scopeKey, user: { bannedAt: null } } }),
  ]);
  return { rank: better + 1, score: mine.score, accuracy: mine.accuracy, total };
}

/**
 * "Better than 82% of players" — only with enough real entries; otherwise null (never invented).
 */
export async function percentileFor(scope: LeaderboardScope, scopeKey: string, score: number, userId: string): Promise<number | null> {
  const where = { product: "HOMES" as const, scope, scopeKey, userId: { not: userId }, user: { bannedAt: null } };
  const total = await db.leaderboardEntry.count({ where });
  if (total < MIN_PERCENTILE_SAMPLE) return null;
  const below = await db.leaderboardEntry.count({ where: { ...where, score: { lt: score } } });
  return Math.round((below / total) * 100);
}

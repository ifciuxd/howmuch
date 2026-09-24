import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { auth } from "@/auth";
import { db, Prisma, type User } from "@/database/client";
import { env } from "@/lib/env";
import { guestName, isValidUsername } from "@/lib/names";
export { assignUsernameIfMissing, promoteIfAdminEmail } from "./account-hooks";
import { sign, unsign } from "@/lib/signing";

/**
 * Player identity.
 *
 * Everyone is a `User` row. Anonymous players are guests identified by a signed,
 * http-only cookie — created lazily the first time they actually start a game.
 * When a guest signs in, their games, scores, streak and passes move to the account.
 */

export const GUEST_COOKIE = "hm_guest";
const GUEST_PURPOSE = "guest";

export type CurrentUser = User;

/** The signed-in user, else the guest from the cookie, else null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth().catch(() => null);
  if (session?.user?.id) {
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user) return user;
  }
  const guestId = unsign((await cookies()).get(GUEST_COOKIE)?.value, GUEST_PURPOSE);
  if (guestId) {
    const guest = await db.user.findUnique({ where: { id: guestId } });
    if (guest?.isGuest) return guest;
  }
  return null;
});

export class BannedError extends Error {
  constructor() {
    super("This account can't play right now.");
    this.name = "BannedError";
  }
}

/** For server actions: returns the current player, creating a guest if needed. */
export async function getOrCreatePlayer(): Promise<CurrentUser> {
  const existing = await getCurrentUser();
  if (existing) {
    if (existing.bannedAt) throw new BannedError();
    return existing;
  }
  const guest = await createGuest();
  (await cookies()).set(GUEST_COOKIE, sign(guest.id, GUEST_PURPOSE), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  return guest;
}

async function createGuest(): Promise<User> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await db.user.create({ data: { isGuest: true, username: guestName(randomUUID()) } });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  return db.user.create({ data: { isGuest: true, username: `Player ${randomUUID().slice(0, 8)}` } });
}

export type UsernameResult = { ok: true } | { ok: false; error: string };

export async function changeUsername(userId: string, username: string): Promise<UsernameResult> {
  const clean = username.trim().replace(/\s+/g, " ");
  if (!isValidUsername(clean)) return { ok: false, error: "3–24 characters: letters, numbers, spaces, dots, dashes." };
  try {
    await db.user.update({ where: { id: userId }, data: { username: clean } });
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "That name is taken." };
    throw e;
  }
}

/**
 * Move a guest's history into the signed-in account and drop the guest cookie.
 * Safe to call repeatedly.
 */
export async function claimGuest(userId: string): Promise<{ mergedGames: number }> {
  const jar = await cookies();
  const guestId = unsign(jar.get(GUEST_COOKIE)?.value, GUEST_PURPOSE);
  jar.delete(GUEST_COOKIE);
  if (!guestId || guestId === userId) return { mergedGames: 0 };

  return db.$transaction(async (tx) => {
    const guest = await tx.user.findUnique({ where: { id: guestId } });
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!guest?.isGuest || !user) return { mergedGames: 0 };

    // Games — a daily can only be owned once; the account's own attempt wins.
    const userDailies = new Set(
      (await tx.game.findMany({ where: { userId, dailyChallengeId: { not: null } }, select: { dailyChallengeId: true } })).map((g) => g.dailyChallengeId),
    );
    const guestGames = await tx.game.findMany({ where: { userId: guestId }, select: { id: true, dailyChallengeId: true } });
    const movable = guestGames.filter((g) => !g.dailyChallengeId || !userDailies.has(g.dailyChallengeId)).map((g) => g.id);
    await tx.game.updateMany({ where: { id: { in: movable } }, data: { userId } });

    // Leaderboards — keep the better entry per board.
    const guestEntries = await tx.leaderboardEntry.findMany({ where: { userId: guestId } });
    for (const e of guestEntries) {
      const mine = await tx.leaderboardEntry.findUnique({
        where: { product_scope_scopeKey_userId: { product: e.product, scope: e.scope, scopeKey: e.scopeKey, userId } },
      });
      if (!mine) {
        if (movable.includes(e.gameId)) await tx.leaderboardEntry.update({ where: { id: e.id }, data: { userId } });
      } else if (e.score > mine.score && movable.includes(e.gameId)) {
        await tx.leaderboardEntry.update({ where: { id: mine.id }, data: { score: e.score, accuracy: e.accuracy, gameId: e.gameId } });
      }
    }

    await tx.subscription.updateMany({ where: { userId: guestId }, data: { userId } });

    // Streaks — the most recent run continues.
    const guestNewer = (guest.lastDailyDate ?? "") > (user.lastDailyDate ?? "");
    await tx.user.update({
      where: { id: userId },
      data: {
        isGuest: false,
        currentStreak: guestNewer ? guest.currentStreak : user.currentStreak,
        lastDailyDate: guestNewer ? guest.lastDailyDate : user.lastDailyDate,
        longestStreak: Math.max(user.longestStreak, guest.longestStreak),
      },
    });
    await tx.user.delete({ where: { id: guestId } });
    return { mergedGames: movable.length };
  });
}

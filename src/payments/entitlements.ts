import { db } from "@/database/client";

/**
 * Entitlements — what a player has paid for. Checked server-side only.
 */

export const DAY_PASS = {
  type: "DAY_PASS" as const,
  name: "24 HOURS UNLIMITED",
  priceCents: 100,
  currency: "usd",
  durationMs: 24 * 60 * 60 * 1000,
};

export async function activePass(userId: string, now = new Date()) {
  return db.subscription.findFirst({
    where: { userId, status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: { expiresAt: "desc" },
  });
}

export async function hasUnlimited(userId: string): Promise<boolean> {
  return Boolean(await activePass(userId));
}

/**
 * Grant (or extend) a 24h pass for a completed checkout. Idempotent per checkout
 * session: calling it twice for the same session never grants twice.
 */
export async function fulfilDayPass(opts: { userId: string; provider: string; sessionId: string; amountCents?: number | null; currency?: string | null }) {
  const existing = await db.subscription.findUnique({ where: { providerSessionId: opts.sessionId } });
  if (existing?.status === "ACTIVE") return existing;

  const now = new Date();
  const current = await activePass(opts.userId, now);
  const startsAt = current?.expiresAt && current.expiresAt > now ? current.expiresAt : now;
  const expiresAt = new Date(startsAt.getTime() + DAY_PASS.durationMs);

  return db.subscription.upsert({
    where: { providerSessionId: opts.sessionId },
    update: { status: "ACTIVE", startsAt, expiresAt, amountCents: opts.amountCents ?? DAY_PASS.priceCents, currency: opts.currency ?? DAY_PASS.currency },
    create: {
      userId: opts.userId,
      type: "DAY_PASS",
      status: "ACTIVE",
      provider: opts.provider,
      providerSessionId: opts.sessionId,
      amountCents: opts.amountCents ?? DAY_PASS.priceCents,
      currency: opts.currency ?? DAY_PASS.currency,
      startsAt,
      expiresAt,
    },
  });
}

import { db, Prisma } from "@/database/client";
import { env } from "@/lib/env";

/** Account lifecycle hooks used by Auth.js events (kept free of auth imports to avoid cycles). */

export async function promoteIfAdminEmail(userId: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  if (!user?.email || user.role === "ADMIN") return;
  if (!env.adminEmails.includes(user.email.toLowerCase())) return;
  await db.user.update({ where: { id: userId }, data: { role: "ADMIN", isGuest: false } });
  await db.adminAuditLog.create({
    data: { actorId: null, action: "user.promote.env", entityType: "User", entityId: userId, details: { via: "ADMIN_EMAILS" } },
  });
}

function baseHandle(name: string | null, email: string | null): string {
  const raw = (name || email?.split("@")[0] || "player").replace(/[^\p{L}\p{N} _.-]/gu, "").trim();
  const trimmed = raw.slice(0, 18) || "player";
  return trimmed.length < 3 ? `${trimmed}player` : trimmed;
}

export async function assignUsernameIfMissing(userId: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { username: true, name: true, email: true } });
  if (!user || user.username) return;
  const base = baseHandle(user.name, user.email);
  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? base : `${base}${Math.floor(100 + Math.random() * 900)}`;
    try {
      await db.user.update({ where: { id: userId }, data: { username: candidate } });
      return;
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
}


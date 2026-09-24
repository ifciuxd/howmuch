/** Promote an existing account to ADMIN:  npm run admin:grant -- someone@example.com */
import "dotenv/config";
import { db } from "../src/database/client";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run admin:grant -- <email>");
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No account with email ${email}. Sign in once first, then run this again.`);
  await db.user.update({ where: { id: user.id }, data: { role: "ADMIN", isGuest: false } });
  await db.adminAuditLog.create({ data: { action: "user.promote.cli", entityType: "User", entityId: user.id, details: { email } } });
  console.log(`${email} is now an admin.`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message);
    await db.$disconnect();
    process.exit(1);
  });

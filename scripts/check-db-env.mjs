// Fails the deploy build early with an actionable message when no database is connected.
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error(
    "\n✖ No database connected.\n" +
      "  HOWMUCH? needs Postgres. In Vercel: Project → Storage → Create Database → Neon (Free) →\n" +
      "  connect it to this project (all environments), then Redeploy.\n",
  );
  process.exit(1);
}
if (!process.env.AUTH_SECRET) {
  console.error("\n✖ AUTH_SECRET is not set. Add it in Project → Settings → Environment Variables (any long random string), then Redeploy.\n");
  process.exit(1);
}
console.log("✓ Database and AUTH_SECRET configured");

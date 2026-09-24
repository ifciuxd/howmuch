import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Optional here so `npm install` (prisma generate) works before .env exists;
  // migrate/seed commands still need DATABASE_URL.
  // Migrations prefer a direct (unpooled) connection when the host provides one (Neon / Vercel Postgres).
  datasource: {
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.DATABASE_URL ??
      process.env.POSTGRES_URL,
  },
});

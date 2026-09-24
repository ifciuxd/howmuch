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
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

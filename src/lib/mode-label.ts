import { db } from "@/database/client";
import { countryName, formatShareDate } from "./format";

export async function modeLabel(mode: string, scopeKey: string | null): Promise<string> {
  switch (mode) {
    case "DAILY":
      return `Daily · ${scopeKey ? formatShareDate(scopeKey) : ""}`;
    case "CITY": {
      const city = scopeKey ? await db.city.findUnique({ where: { slug: scopeKey }, select: { name: true } }) : null;
      return `City · ${city?.name ?? scopeKey ?? ""}`;
    }
    case "COUNTRY":
      return `Country · ${scopeKey ? countryName(scopeKey) : ""}`;
    default:
      return "Quick play";
  }
}

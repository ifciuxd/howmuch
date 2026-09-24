import { db } from "@/database/client";
import { utcDateKey } from "@/game/daily";
import { type HomeFacts, toHomeFacts } from "@/game/products/homes";
import { createRng } from "@/game/rng";
import { findDaily } from "./daily-service";
import { PLAYABLE_WHERE } from "./pool-service";

/** A showcase home for the landing page — never one of today's daily homes, never with a price. */
export async function featuredHome(): Promise<{ id: string; facts: HomeFacts } | null> {
  const today = utcDateKey();
  const daily = await findDaily(today);
  const exclude = daily?.rounds.map((r) => r.propertyId) ?? [];
  const candidates = await db.property.findMany({
    where: { ...PLAYABLE_WHERE, id: { notIn: exclude }, difficulty: { lte: 7 } },
    select: {
      id: true,
      city: true,
      country: true,
      countryCode: true,
      currency: true,
      areaM2: true,
      rooms: true,
      bathrooms: true,
      propertyType: true,
      floor: true,
      imageUrls: true,
      cityRef: { select: { slug: true, name: true } },
    },
    orderBy: { id: "asc" },
    take: 200,
  });
  if (!candidates.length) return null;
  const hour = new Date().getUTCHours();
  const rng = createRng(`featured:${today}:${hour}`);
  const pick = candidates[Math.floor(rng() * candidates.length)];
  return { id: pick.id, facts: toHomeFacts(pick) };
}

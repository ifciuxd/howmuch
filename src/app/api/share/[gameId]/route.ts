import { ImageResponse } from "next/og";
import { db } from "@/database/client";
import { env } from "@/lib/env";
import { countryName } from "@/lib/format";
import { getShareSummary } from "@/services/game-service";
import { ShareCard } from "@/share/share-card";
import { ogFonts } from "@/share/fonts";
import { shareHeadline } from "@/share/share-text";

/** Spoiler-free result image. ?format=og (1200×630, link previews) | portrait (1080×1350, stories/feeds). */
export async function GET(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const format = new URL(req.url).searchParams.get("format") === "portrait" ? "portrait" : "og";
  const summary = await getShareSummary(gameId);
  if (!summary) return new Response("Not found", { status: 404 });
  const scopeName =
    summary.mode === "CITY" && summary.scopeKey
      ? (await db.city.findUnique({ where: { slug: summary.scopeKey }, select: { name: true } }))?.name
      : summary.mode === "COUNTRY" && summary.scopeKey
        ? countryName(summary.scopeKey)
        : null;
  const size = format === "og" ? { width: 1200, height: 630 } : { width: 1080, height: 1350 };
  return new ImageResponse(
    ShareCard({
      format,
      data: {
        headline: shareHeadline(summary.mode, summary.scopeKey, scopeName),
        totalScore: summary.totalScore,
        maxScore: summary.maxScore,
        accuracy: summary.accuracy,
        tiers: summary.tiers,
        username: summary.username,
        host: new URL(env.appUrl).host,
      },
    }),
    { ...size, fonts: await ogFonts(), headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}

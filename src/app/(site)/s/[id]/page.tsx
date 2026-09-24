import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayButton } from "@/components/game/play-button";
import { ButtonLink } from "@/components/ui/button";
import { tierEmoji } from "@/game/scoring";
import { formatNumber, formatPercent } from "@/lib/format";
import { getShareSummary } from "@/services/game-service";
import { shareHeadline } from "@/share/share-text";

/** Public landing for shared results. Spoiler-free: score only, never homes or prices. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = await getShareSummary(id);
  if (!s) return { title: "Result not found" };
  const title = `${formatNumber(s.totalScore)} / ${formatNumber(s.maxScore)} on HOWMUCH?`;
  const description = `${s.username ?? "Someone"} guessed home prices with ${formatPercent(s.accuracy)} accuracy. Can you beat that?`;
  const image = { url: `/api/share/${id}?format=og`, width: 1200, height: 630, alt: title };
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function SharedResult({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getShareSummary(id);
  if (!s) notFound();
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-start gap-6 px-4 pt-12 md:px-8 md:pt-20">
      <p className="label text-accent-ink">{shareHeadline(s.mode, s.scopeKey)}</p>
      <h1 className="text-heading-xl uppercase wdth-condensed">
        {s.username ?? "Someone"} scored {formatNumber(s.totalScore)} / {formatNumber(s.maxScore)}
      </h1>
      <p className="text-[2.5rem] tracking-[0.2em]" aria-label="Round results">{s.tiers.map(tierEmoji).join("")}</p>
      <p className="text-heading-md">{formatPercent(s.accuracy)} accuracy. Think you can beat it?</p>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <PlayButton size="xl" fullWidth className="sm:w-auto sm:min-w-56">Play now</PlayButton>
        {s.mode === "DAILY" && (
          <ButtonLink href="/daily" variant="secondary" size="xl">
            Today&apos;s daily
          </ButtonLink>
        )}
      </div>
    </section>
  );
}

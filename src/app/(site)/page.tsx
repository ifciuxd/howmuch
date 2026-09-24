import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DailyCountdown } from "@/components/game/countdown";
import { PlayButton } from "@/components/game/play-button";
import { CityCard } from "@/components/home/city-card";
import { FeaturedCard } from "@/components/home/featured-card";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TrackView } from "@/components/layout/track-view";
import { formatShareDate } from "@/lib/format";
import { utcDateKey } from "@/game/daily";
import { featuredHome } from "@/services/home-service";
import { getBoard } from "@/services/leaderboard-service";
import { playableCities, playableCount } from "@/services/pool-service";
import { getCurrentUser } from "@/services/user-service";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: "01", title: "Look at the home.", body: "Real listings. Swipe the photos, check the size." },
  { n: "02", title: "Guess the price.", body: "Type a number. No multiple choice, no hints." },
  { n: "03", title: "See how close you really are.", body: "Within 1% is a bullseye. Five homes, one score." },
];

export default async function HomePage() {
  const today = utcDateKey();
  const [featured, cities, top, count, user] = await Promise.all([
    featuredHome(),
    playableCities(),
    getBoard("DAILY", today, 5),
    playableCount(),
    getCurrentUser(),
  ]);
  const ready = count >= 5;

  return (
    <>
      <TrackView event="home_viewed" />
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-[1440px] items-center gap-10 px-4 pt-8 pb-16 md:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-16 lg:pb-24">
        <div className="flex flex-col items-start gap-7">
          <p className="label rounded-full border border-border-strong px-3 py-1.5 text-text-secondary">HOWMUCH? Homes</p>
          <h1 className="text-[clamp(3.75rem,15vw,5rem)] leading-[0.84] font-black tracking-[-0.035em] uppercase wdth-condensed sm:text-display lg:text-[clamp(5rem,9.6vw,9.75rem)]">
            Howmuch<span className="text-accent">?</span>
          </h1>
          <p className="-mt-2 font-serif text-[clamp(2rem,4.2vw,3.25rem)] leading-none italic">See it. Guess it.</p>
          <p className="max-w-md text-body text-text-secondary md:text-[1.125rem]">
            Real homes from real listings. You name the price. We tell you how close you got — to the euro, złoty or pound.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <PlayButton size="xl" fullWidth className="sm:w-auto sm:min-w-56" testId="hero-play">
              Play now
            </PlayButton>
            <ButtonLink href="/daily" variant="secondary" size="xl" className="w-full sm:w-auto sm:min-w-40">
              Daily
            </ButtonLink>
          </div>
          <p className="label text-text-muted">5 homes · 1 score · 0 excuses</p>
        </div>
        <div className="w-full">
          {featured ? (
            <FeaturedCard id={featured.id} facts={featured.facts} />
          ) : (
            <EmptyState title="No homes here yet." body="We're adding more cities soon. (Admins: import listings from the admin panel.)" />
          )}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section aria-labelledby="how" className="border-y border-border bg-surface">
        <div className="mx-auto max-w-[1440px] px-4 py-14 md:px-8 md:py-20">
          <h2 id="how" className="sr-only">How it works</h2>
          <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((s) => (
              <li key={s.n} className="flex flex-col gap-3">
                <span className="text-heading-xl text-accent wdth-condensed">{s.n}</span>
                <p className="text-heading-lg">{s.title}</p>
                <p className="text-body text-text-secondary">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Daily + today's top players ──────────────────── */}
      <section className="mx-auto grid max-w-[1440px] gap-6 px-4 pt-16 md:px-8 lg:grid-cols-[1fr_1.4fr] lg:gap-10 lg:pt-24">
        <div className="flex flex-col justify-between gap-8 rounded-xl bg-surface-dark p-7 text-text-inverse md:p-10">
          <div className="flex flex-col gap-3">
            <p className="label text-accent">Daily · {formatShareDate(today)}</p>
            <p className="text-heading-xl uppercase wdth-condensed">5 homes.<br />One score.</p>
            <p className="max-w-sm text-body text-text-inverse-muted">Same five homes for everyone today. One attempt. Keep your streak alive.</p>
          </div>
          <div className="flex flex-col gap-3">
            <ButtonLink href="/daily" variant="primary" size="lg" className="self-start">
              Play daily
            </ButtonLink>
            <p className="text-body-sm text-text-inverse-muted">
              New homes in <DailyCountdown className="font-bold text-text-inverse tnum" />
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-heading-lg uppercase wdth-condensed">Today&apos;s top players</h2>
            <Link href="/leaderboard?tab=daily" className="inline-flex items-center gap-1 text-body-sm font-semibold hover:text-accent-ink">
              Full board <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          {top.length ? (
            <LeaderboardTable rows={top} meId={user?.id} compact caption="Today's top players" />
          ) : (
            <EmptyState title="Nobody's on the board yet." body="Play today's daily and take the top spot." action={<ButtonLink href="/daily" size="md">Play daily</ButtonLink>} />
          )}
        </div>
      </section>

      {/* ── Cities ───────────────────────────────────────── */}
      <section className="mx-auto max-w-[1440px] px-4 pt-16 md:px-8 lg:pt-24">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-heading-lg uppercase wdth-condensed">Popular cities</h2>
          <Link href="/cities" className="inline-flex items-center gap-1 text-body-sm font-semibold hover:text-accent-ink">
            All cities <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        {cities.length ? (
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-5">
            {cities.slice(0, 5).map((c, i) => (
              <CityCard key={c.slug} city={c} priority={i < 2} className="w-[70vw] max-w-72 shrink-0 snap-start md:w-auto md:max-w-none" />
            ))}
          </div>
        ) : (
          <EmptyState title="No cities yet." body="We're adding more cities soon." />
        )}
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <section className="mx-auto max-w-[1440px] px-4 pt-16 md:px-8 lg:pt-24">
        <div className="flex flex-col items-start gap-6 rounded-xl bg-accent p-8 text-text md:flex-row md:items-center md:justify-between md:p-12">
          <p className="text-heading-xl uppercase wdth-condensed">Think you know<br className="hidden md:block" /> real estate?</p>
          {ready ? (
            <PlayButton variant="dark" size="xl">
              Prove it
            </PlayButton>
          ) : (
            <ButtonLink href="/cities" variant="secondary" size="xl">
              Browse cities
            </ButtonLink>
          )}
        </div>
      </section>
    </>
  );
}

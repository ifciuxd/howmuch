import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PlayButton } from "@/components/game/play-button";
import { ResultRounds } from "@/components/game/result-rounds";
import { ScoreCounter } from "@/components/game/score-counter";
import { SharePanel } from "@/components/share/share-panel";
import { ButtonLink } from "@/components/ui/button";
import { db } from "@/database/client";
import { gameVerdict } from "@/game/copy";
import { utcDateKey } from "@/game/daily";
import { tierEmoji } from "@/game/scoring";
import { env } from "@/lib/env";
import { countryName, formatNumber, formatPercent, formatPrice } from "@/lib/format";
import { modeLabel } from "@/lib/mode-label";
import { displayStreak } from "@/services/daily-service";
import { GameError, getResults, quickPlayPercentile, quotaStatus } from "@/services/game-service";
import { getMyRank, percentileFor } from "@/services/leaderboard-service";
import { getCurrentUser } from "@/services/user-service";
import { buildShareText } from "@/share/share-text";

export const metadata: Metadata = { title: "Results", robots: { index: false } };

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getCurrentUser();
  if (!player) notFound();
  let results;
  try {
    results = await getResults(id, player.id);
  } catch (e) {
    if (e instanceof GameError) notFound();
    throw e;
  }
  if (results.status !== "COMPLETED") redirect(`/game/${id}`);

  const isDaily = results.mode === "DAILY";
  const scopeName =
    results.mode === "CITY" && results.scopeKey
      ? (await db.city.findUnique({ where: { slug: results.scopeKey }, select: { name: true } }))?.name
      : results.mode === "COUNTRY" && results.scopeKey
        ? countryName(results.scopeKey)
        : null;

  const [label, completedCount, quota, rank, percentile] = await Promise.all([
    modeLabel(results.mode, results.scopeKey),
    db.game.count({ where: { userId: player.id, status: "COMPLETED" } }),
    quotaStatus(player.id),
    isDaily && results.scopeKey ? getMyRank("DAILY", results.scopeKey, player.id) : Promise.resolve(null),
    isDaily && results.scopeKey
      ? percentileFor("DAILY", results.scopeKey, results.totalScore, player.id)
      : results.mode === "QUICK"
        ? quickPlayPercentile(results.totalScore, results.id)
        : Promise.resolve(null),
  ]);

  const shareUrl = `${env.appUrl}/s/${results.id}`;
  const shareText = buildShareText({
    mode: results.mode,
    scopeKey: results.scopeKey,
    scopeName,
    totalScore: results.totalScore,
    maxScore: results.maxScore,
    accuracy: results.averageAccuracy,
    tiers: results.rounds.map((r) => r.tier),
    url: shareUrl,
  });
  const streak = displayStreak(player.lastDailyDate, player.currentStreak);
  const firstGame = completedCount === 1;
  const showPassNudge = !quota.unlimited && quota.used >= 3;
  const dailyDoneToday = isDaily && results.scopeKey === utcDateKey();

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-4 pt-6 md:px-8 md:pt-10">
      {/* ── Payoff ─────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl bg-surface-dark text-text-inverse" aria-labelledby="final-score">
        <div className="flex flex-col gap-8 p-6 md:p-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="label text-accent">Game complete · {label}</p>
            {isDaily && streak > 0 && (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-surface-dark-raised px-3 py-1.5 text-body-sm font-extrabold tnum" aria-label={`Daily streak ${streak}`}>
                <span aria-hidden>🔥</span> {streak} day streak
              </p>
            )}
          </div>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 id="final-score" className="flex flex-wrap items-baseline gap-x-4 font-black wdth-condensed">
                <ScoreCounter value={results.totalScore} durationMs={1200} className="text-[clamp(5rem,17vw,11rem)] leading-[0.82] tracking-[-0.045em]" />
                <span className="text-heading-xl text-text-inverse-muted tnum">/ {formatNumber(results.maxScore)}</span>
              </h1>
              <p className="mt-4 text-heading-md tnum">{formatPercent(results.averageAccuracy)} average accuracy</p>
              <p className="mt-3 font-serif text-[clamp(1.75rem,3.4vw,2.5rem)] leading-tight italic">{gameVerdict(results.totalScore, results.maxScore)}</p>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <p className="text-[2.25rem] tracking-[0.2em]" aria-label="Round results">
                {results.rounds.map((r) => tierEmoji(r.tier)).join("")}
              </p>
              {rank && (
                <p className="text-body text-text-inverse-muted">
                  <span className="font-bold text-text-inverse">#{rank.rank}</span> of {formatNumber(rank.total)} players today
                </p>
              )}
              {percentile != null && (
                <p className="text-body text-text-inverse-muted" data-testid="percentile">
                  Better than <span className="font-bold text-accent">{percentile}%</span> of {isDaily ? "players today" : "Quick Play games this month"}.
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <PlayButton mode={results.mode === "DAILY" ? "QUICK" : results.mode} scope={results.mode === "CITY" || results.mode === "COUNTRY" ? (results.scopeKey ?? undefined) : undefined} size="xl" className="sm:min-w-56" fullWidth testId="play-again">
              Play again
            </PlayButton>
            {dailyDoneToday ? (
              <ButtonLink href="/leaderboard?tab=daily" variant="ghost-inverse" size="xl" className="w-full sm:w-auto">
                Leaderboard
              </ButtonLink>
            ) : (
              <ButtonLink href="/daily" variant="ghost-inverse" size="xl" className="w-full sm:w-auto">
                Daily
              </ButtonLink>
            )}
            <ButtonLink href="#share" variant="inverse" size="xl" className="w-full sm:w-auto">
              Share
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ── Save score (guests) ─────────────────────────── */}
      {player.isGuest && (
        <section className="flex flex-col items-start justify-between gap-4 rounded-xl border-2 border-text p-6 md:flex-row md:items-center md:p-8">
          <div>
            <p className="text-heading-md">Want to save your score?</p>
            <p className="mt-1 text-body text-text-secondary">Keep your streak, stats and leaderboard spots on any device. Takes ten seconds.</p>
          </div>
          <ButtonLink href={`/signin?callbackUrl=${encodeURIComponent(`/game/${results.id}/results`)}`} variant="dark" size="lg">
            Save my score
          </ButtonLink>
        </section>
      )}

      {/* ── First game: what's next ─────────────────────── */}
      {firstGame && (
        <section aria-labelledby="next-up" className="grid gap-4 md:grid-cols-4">
          <h2 id="next-up" className="text-heading-lg uppercase wdth-condensed md:col-span-4">Nice. Here&apos;s what else there is.</h2>
          {[
            { t: "Daily", b: "Same five homes for everyone, once a day.", href: "/daily" },
            { t: "Streak", b: "Play the daily on consecutive days. Don't break it.", href: "/daily" },
            { t: "Leaderboard", b: "Global, daily, city and country boards.", href: "/leaderboard" },
            { t: "Share", b: "Spoiler-free results. Make your friends guess too.", href: "#share" },
          ].map((x) => (
            <Link key={x.t} href={x.href} className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-text">
              <p className="label text-accent-ink">{x.t}</p>
              <p className="mt-2 text-body text-text-secondary">{x.b}</p>
            </Link>
          ))}
        </section>
      )}

      {/* ── Stats ───────────────────────────────────────── */}
      <section aria-labelledby="stats" className="flex flex-col gap-5">
        <h2 id="stats" className="text-heading-lg uppercase wdth-condensed">The breakdown</h2>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
          {[
            { k: "Best round", v: results.best ? `${formatNumber(results.best.score)} pts` : "—", s: results.best?.city },
            { k: "Worst round", v: results.worst ? `${formatNumber(results.worst.score)} pts` : "—", s: results.worst?.city },
            { k: "Average error", v: formatPercent(results.averageError), s: "per home" },
            {
              k: results.highest ? "Highest price" : "Cities",
              v: results.highest ? formatPrice(results.highest.price, results.highest.currency) : String(results.cities.length),
              s: results.highest ? `lowest ${formatPrice(results.lowest!.price, results.lowest!.currency)}` : results.cities.join(", "),
            },
          ].map((x) => (
            <div key={x.k} className="flex flex-col gap-1 bg-surface p-5">
              <dt className="label text-text-muted">{x.k}</dt>
              <dd className="text-heading-md font-extrabold tnum">{x.v}</dd>
              {x.s && <dd className="truncate text-body-sm text-text-secondary">{x.s}</dd>}
            </div>
          ))}
        </dl>
        <p className="text-body-sm text-text-secondary">Cities this game: {results.cities.join(" · ")}</p>
        <ResultRounds rounds={results.rounds} />
      </section>

      {/* ── Pass nudge (only after several games) ──────── */}
      {showPassNudge && (
        <section className="flex flex-col items-start justify-between gap-4 rounded-xl bg-accent-soft p-6 md:flex-row md:items-center md:p-8">
          <div>
            <p className="text-heading-md">Want unlimited homes?</p>
            <p className="mt-1 text-body text-text-secondary">
              {quota.remaining > 0 ? `${quota.remaining} free games left today.` : "You've played today's free games."} 24 hours of unlimited play is $1. The daily is always free.
            </p>
          </div>
          <ButtonLink href="/pass" variant="dark" size="lg">
            24 hours — $1
          </ButtonLink>
        </section>
      )}

      {/* ── Share ──────────────────────────────────────── */}
      <section id="share" aria-labelledby="share-title" className="scroll-mt-24 grid gap-6 rounded-xl bg-surface-dark p-6 text-text-inverse md:grid-cols-[1fr_1.1fr] md:p-10">
        <div className="flex flex-col gap-4">
          <h2 id="share-title" className="text-heading-xl uppercase wdth-condensed">Share your score</h2>
          <p className="text-body text-text-inverse-muted">No spoilers — just your score and five little houses. Orange means you nailed it.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/share/${results.id}?format=og`} alt="Your share card" width={1200} height={630} className="mt-2 w-full rounded-lg border border-border-dark" loading="lazy" />
        </div>
        <SharePanel text={shareText} url={shareUrl} imageUrl={`/api/share/${results.id}?format=portrait`} fileName={`howmuch-${results.totalScore}.png`} />
      </section>
    </div>
  );
}

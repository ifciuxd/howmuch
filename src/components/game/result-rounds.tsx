import { ArrowUpRight } from "lucide-react";
import { tierEmoji, tierLabel } from "@/game/scoring";
import type { ResultRound } from "@/services/game-service";
import { formatArea, formatNumber, formatPercent, formatPrice } from "@/lib/format";
import { sizedImage } from "@/lib/images";

export function ResultRounds({ rounds }: { rounds: ResultRound[] }) {
  return (
    <ol className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
      {rounds.map((r) => (
        <li key={r.index} className="grid grid-cols-[64px_1fr_auto] items-center gap-4 p-4 sm:grid-cols-[96px_1.2fr_1fr_1fr_auto] md:p-5">
          <div className="relative size-16 overflow-hidden rounded-md bg-surface-muted sm:h-18 sm:w-24">
            {r.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sizedImage(r.image, 320)} alt="" loading="lazy" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="label text-text-muted">Home {r.index + 1}</p>
            <p className="truncate font-bold">{r.city}, {r.country}</p>
            <p className="text-body-sm text-text-secondary tnum">
              {r.areaM2 ? formatArea(r.areaM2) : ""}
              {r.sourceUrl && (
                <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="ml-2 inline-flex items-center gap-0.5 underline-offset-2 hover:underline">
                  listing <ArrowUpRight className="size-3" aria-hidden />
                </a>
              )}
            </p>
          </div>
          <div className="hidden sm:block">
            <p className="label text-text-muted">Real</p>
            <p className="font-bold tnum">{formatPrice(r.price, r.currency)}</p>
          </div>
          <div className="hidden sm:block">
            <p className="label text-text-muted">You</p>
            <p className="tnum text-text-secondary">{formatPrice(r.guess, r.currency)}</p>
            <p className="text-body-sm text-text-muted tnum">{formatPercent(r.errorPct)} off</p>
          </div>
          <div className="text-right">
            <p className="text-heading-md font-black wdth-condensed tnum">
              <span className="mr-1.5 text-[0.8em]" aria-hidden>{tierEmoji(r.tier)}</span>
              {formatNumber(r.score)}
            </p>
            <p className="label text-text-muted">{tierLabel(r.tier)}</p>
            <p className="mt-1 text-body-sm text-text-secondary tnum sm:hidden">
              {formatPrice(r.price, r.currency)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

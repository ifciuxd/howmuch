import { startGameAction } from "@/app/actions/game";
import { type HomeFacts, primaryFactsLine, PROPERTY_TYPE_LABELS } from "@/game/products/homes";
import { countryFlag, currencyMeta } from "@/lib/format";
import { sizedImage } from "@/lib/images";

/** Pre-game property card: photo, place, size — and the question. Never a price. */
export function FeaturedCard({ id, facts }: { id: string; facts: HomeFacts }) {
  const meta = currencyMeta(facts.currency);
  const hidden = meta.position === "prefix" ? `${meta.symbol} ??? ???` : `??? ??? ${meta.symbol}`;
  return (
    <form action={startGameAction} className="group relative block overflow-hidden rounded-xl bg-surface-dark text-left text-text-inverse shadow-lg">
      <input type="hidden" name="mode" value="QUICK" />
      <input type="hidden" name="first" value={id} />
      <div className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] xl:aspect-[5/5]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sizedImage(facts.images[0], 1280)}
          alt={`A home in ${facts.city}, ${facts.country}`}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/0" aria-hidden />
        <span className="label absolute top-4 left-4 rounded-full bg-black/55 px-3 py-1.5 text-white backdrop-blur-sm">Try this one</span>
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-5 md:p-7">
          <div>
            <p className="text-heading-lg font-black uppercase wdth-condensed">
              {facts.city}, {facts.country} <span className="text-[0.55em] align-middle" aria-hidden>{countryFlag(facts.countryCode)}</span>
            </p>
            <p className="mt-1 text-body text-text-inverse/80 tnum">
              {[primaryFactsLine(facts), PROPERTY_TYPE_LABELS[facts.propertyType]].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-white/20 pt-4">
            <p className="text-price-lg text-white/90 tnum wdth-condensed" aria-label="Price hidden">
              {hidden}
            </p>
            <button
              type="submit"
              className="inline-flex h-12 shrink-0 items-center rounded-md bg-accent px-5 text-[0.8125rem] font-extrabold uppercase wdth-expanded tracking-[0.05em] text-text transition-colors hover:bg-accent-hover"
            >
              How much?
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

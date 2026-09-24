import Link from "next/link";
import type { PlayableCity } from "@/services/pool-service";
import { countryFlag } from "@/lib/format";
import { sizedImage } from "@/lib/images";
import { cn } from "@/lib/cn";

export function CityCard({ city, className, priority }: { city: PlayableCity; className?: string; priority?: boolean }) {
  return (
    <Link
      href={`/cities/${city.slug}`}
      className={cn("group relative block overflow-hidden rounded-xl bg-surface-dark text-text-inverse", className)}
    >
      <div className="relative aspect-[4/5]">
        {city.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sizedImage(city.heroImageUrl, 800)}
            alt=""
            loading={priority ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 bg-surface-dark-raised" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
          <div className="min-w-0">
            <p className="label text-white/75">
              <span aria-hidden>{countryFlag(city.countryCode)}</span> {city.country}
            </p>
            <p className="mt-1 text-[clamp(1.5rem,2.3vw,2.25rem)] leading-[0.95] font-black break-words uppercase wdth-condensed">{city.name}</p>
            <p className="mt-1 text-body-sm text-white/75 tnum">{city.homes} homes</p>
          </div>
          <span className="label shrink-0 rounded-full bg-accent px-3 py-2 text-text transition-transform duration-(--duration-fast) group-hover:-translate-y-0.5">Play</span>
        </div>
      </div>
    </Link>
  );
}

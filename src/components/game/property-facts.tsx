import { type HomeFacts, primaryFactsLine, secondaryFactsLine } from "@/game/products/homes";
import { countryFlag } from "@/lib/format";
import { cn } from "@/lib/cn";

/** BARCELONA, SPAIN · 78 m² · 3 rooms · Apartment · 4th floor */
export function PropertyHeader({ facts, className, size = "lg" }: { facts: HomeFacts; className?: string; size?: "lg" | "md" }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <h1 className={cn("font-black uppercase wdth-condensed leading-[0.9] tracking-[-0.02em]", size === "lg" ? "text-heading-xl" : "text-heading-lg")}>
        {facts.city},{" "}
        <span className="whitespace-nowrap">
          {facts.country}
          <span className="ml-2 align-[0.12em] text-[0.5em]" aria-hidden>
            {countryFlag(facts.countryCode)}
          </span>
        </span>
      </h1>
    </div>
  );
}

export function PropertyFacts({ facts, className }: { facts: HomeFacts; className?: string }) {
  const primary = primaryFactsLine(facts);
  return (
    <dl className={cn("flex flex-col gap-1", className)}>
      <dt className="sr-only">Size and rooms</dt>
      {primary && <dd className="text-heading-md font-extrabold tnum">{primary}</dd>}
      <dt className="sr-only">Type</dt>
      <dd className="text-body text-text-secondary">{secondaryFactsLine(facts)}</dd>
    </dl>
  );
}

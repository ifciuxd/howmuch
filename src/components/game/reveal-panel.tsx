"use client";

import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { GuessResult } from "@/services/game-service";
import { cn } from "@/lib/cn";
import { formatArea, formatPercent, formatPrice } from "@/lib/format";
import { AccuracyMeter } from "./accuracy-meter";
import { ScoreCounter } from "./score-counter";

type Reveal = GuessResult["reveal"];

/**
 * The payoff moment: real price → your guess → distance → accuracy → points.
 * Staggered so each number lands on its own beat; instant with reduced motion.
 */
export function RevealPanel({
  reveal,
  areaM2,
  isLast,
  onNext,
  nextLabel,
  className,
}: {
  reveal: Reveal;
  areaM2: number | null;
  isLast: boolean;
  onNext: () => void;
  nextLabel: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const nextRef = useRef<HTMLButtonElement>(null);
  const beat = (i: number) => (reduce ? { duration: 0 } : { delay: 0.12 + i * 0.22, duration: 0.42, ease: [0.22, 1, 0.36, 1] as const });
  const enter = reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 };

  useEffect(() => {
    const t = setTimeout(() => nextRef.current?.focus({ preventScroll: true }), reduce ? 0 : 1300);
    return () => clearTimeout(t);
  }, [reduce]);

  const directionWord = reveal.direction === "over" ? "over" : reveal.direction === "under" ? "under" : "";
  const ctx = reveal.context;

  return (
    <section
      aria-live="polite"
      aria-label="Round result"
      className={cn("flex flex-col gap-4 rounded-xl bg-surface-dark p-5 text-text-inverse md:p-6", className)}
      data-testid="reveal-panel"
    >
      <motion.div initial={enter} animate={{ opacity: 1, y: 0 }} transition={beat(0)}>
        <p className="label text-text-inverse-muted">Real price</p>
        <p className="mt-2 text-[clamp(2.75rem,6vw,4.25rem)] leading-[0.9] font-extrabold tracking-[-0.03em] text-text-inverse tnum wdth-condensed" data-testid="real-price">
          {formatPrice(reveal.actual, reveal.currency)}
        </p>
      </motion.div>

      <motion.div initial={enter} animate={{ opacity: 1, y: 0 }} transition={beat(1)} className="flex items-baseline justify-between gap-4 border-t border-border-dark pt-4">
        <p className="label text-text-inverse-muted">Your guess</p>
        <p className="text-heading-md tnum">{formatPrice(reveal.guess, reveal.currency)}</p>
      </motion.div>

      <motion.div initial={reduce ? { opacity: 1 } : { opacity: 0 }} animate={{ opacity: 1 }} transition={beat(1.6)}>
        <AccuracyMeter guess={reveal.guess} actual={reveal.actual} delay={reduce ? 0 : 0.55} className="-my-2" />
      </motion.div>

      <motion.div initial={enter} animate={{ opacity: 1, y: 0 }} transition={beat(2.4)} className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-heading-md tnum">
            {reveal.absoluteDiff === 0 ? "Exact" : `${formatPrice(reveal.absoluteDiff, reveal.currency)} off`}
          </p>
          <p className="mt-1 text-body-sm text-text-inverse-muted">
            You were {formatPercent(reveal.errorPct)} {directionWord}
          </p>
        </div>
        <div className="text-right">
          <p className="text-heading-md tnum">{formatPercent(reveal.accuracy)}</p>
          <p className="mt-1 text-body-sm text-text-inverse-muted">accurate</p>
        </div>
      </motion.div>

      <motion.div
        initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduce ? { duration: 0 } : { delay: 0.12 + 3.2 * 0.22, type: "spring", stiffness: 380, damping: 22 }}
        className="flex items-end justify-between gap-4 border-t border-border-dark pt-4"
      >
        <p className="max-w-[60%] font-serif text-[1.65rem] leading-[1.05] italic text-text-inverse">{reveal.line}</p>
        <p className="text-right leading-none" data-testid="round-points">
          <ScoreCounter value={reveal.score} prefix="+" delayMs={reduce ? 0 : 820} className="block text-[clamp(3.5rem,8vw,5.5rem)] leading-[0.82] font-black tracking-[-0.04em] text-accent wdth-condensed" />
          <span className="label text-text-inverse-muted">points</span>
        </p>
      </motion.div>

      <motion.dl initial={enter} animate={{ opacity: 1, y: 0 }} transition={beat(4)} className="flex flex-wrap gap-x-5 gap-y-2 text-body-sm text-text-inverse-muted">
        {reveal.unitValue != null && (
          <div className="flex gap-1.5">
            <dt className="sr-only">Price per square metre</dt>
            <dd className="font-bold text-text-inverse tnum">
              {formatPrice(reveal.unitValue, reveal.currency)} / m²
            </dd>
          </div>
        )}
        {areaM2 && (
          <div>
            <dt className="sr-only">Area</dt>
            <dd className="tnum">{formatArea(areaM2)}</dd>
          </div>
        )}
        {ctx.neighborhood && (
          <div>
            <dt className="sr-only">Neighbourhood</dt>
            <dd>{ctx.neighborhood}</dd>
          </div>
        )}
        {ctx.yearBuilt && (
          <div>
            <dt className="sr-only">Year built</dt>
            <dd>Built {ctx.yearBuilt}</dd>
          </div>
        )}
      </motion.dl>

      {ctx.insight && (
        <motion.p initial={enter} animate={{ opacity: 1, y: 0 }} transition={beat(4.3)} className="text-body-sm text-text-inverse-muted">
          <span className="label mr-2 rounded-sm bg-surface-dark-raised px-1.5 py-0.5 text-text-inverse">{ctx.insightIsAi ? "AI note" : "Note"}</span>
          {ctx.insight}
        </motion.p>
      )}

      <motion.div initial={enter} animate={{ opacity: 1, y: 0 }} transition={beat(4.6)} className="flex flex-col gap-3">
        <Button ref={nextRef} variant="primary" size="xl" fullWidth onClick={onNext} data-testid="next-button">
          {isLast ? "See results" : nextLabel}
        </Button>
        {ctx.sourceUrl && ctx.sourceName && (
          <a
            href={ctx.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center justify-center gap-1 text-body-sm text-text-inverse-muted underline-offset-4 hover:text-text-inverse hover:underline"
          >
            See the listing on {ctx.sourceName}
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
        )}
      </motion.div>
    </section>
  );
}

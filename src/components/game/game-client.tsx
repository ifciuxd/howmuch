"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { reportImageAction, submitGuessAction } from "@/app/actions/game";
import { Wordmark } from "@/components/ui/wordmark";
import type { GuessResult, PlayState, PublicRoundView, RoundSummary } from "@/services/game-service";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { sizedImage } from "@/lib/images";
import { GuessPanel, type LockState } from "./guess-panel";
import { PropertyFacts, PropertyHeader } from "./property-facts";
import { PropertyGallery } from "./property-gallery";
import { RevealPanel } from "./reveal-panel";
import { RoundProgress } from "./round-progress";
import { ScoreCounter } from "./score-counter";

type Phase = "guessing" | "revealed";

const MIN_LOCK_MS = 420;
const LOCKED_HOLD_MS = 260;

/**
 * Game screen orchestration: guess → lock → reveal → next.
 * All scoring happens on the server; this only drives the choreography.
 */
export function GameClient({ initial, modeLabel }: { initial: PlayState; modeLabel: string }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [round, setRound] = useState<PublicRoundView>(initial.current!);
  const [rounds, setRounds] = useState<RoundSummary[]>(initial.rounds);
  const [total, setTotal] = useState(initial.game.totalScore);
  const [prevTotal, setPrevTotal] = useState(initial.game.totalScore);
  const [digits, setDigits] = useState("");
  const [lock, setLock] = useState<LockState>("idle");
  const [phase, setPhase] = useState<Phase>("guessing");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuessResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reported = useRef(new Set<number>());
  const gameId = initial.game.id;
  const roundCount = initial.game.roundCount;

  // Preload the next home's first photos while the player reads the reveal.
  useEffect(() => {
    if (!result?.next) return;
    for (const src of result.next.facts.images.slice(0, 2)) {
      const img = new Image();
      img.src = sizedImage(src, 1280);
    }
  }, [result]);

  const submit = useCallback(async () => {
    const value = Number(digits);
    if (!digits || !Number.isFinite(value) || value <= 0) {
      setError("Enter a price above zero.");
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setLock("locking");
    const started = performance.now();
    const res = await submitGuessAction(gameId, round.index, value);
    const wait = Math.max(0, MIN_LOCK_MS - (performance.now() - started));
    if (!reduce) await new Promise((r) => setTimeout(r, wait));
    if (!res.ok) {
      setLock("idle");
      if (res.code === "GAME_OVER") {
        router.replace(`/game/${gameId}/results`);
        return;
      }
      setError(res.error);
      return;
    }
    setLock("locked");
    if (!reduce) await new Promise((r) => setTimeout(r, LOCKED_HOLD_MS));
    setResult(res.result);
    setRounds(res.result.rounds);
    setPrevTotal(total);
    setTotal(res.result.totalScore);
    setPhase("revealed");
    requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 1023px)").matches) panelRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  }, [digits, gameId, round.index, reduce, router, total]);

  const next = useCallback(() => {
    if (!result) return;
    if (result.completed || !result.next) {
      router.push(`/game/${gameId}/results`);
      return;
    }
    setRound(result.next);
    setResult(null);
    setDigits("");
    setLock("idle");
    setPhase("guessing");
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
  }, [gameId, reduce, result, router]);

  const reportImage = useCallback(
    (i: number) => {
      void i;
      if (reported.current.has(round.index)) return;
      reported.current.add(round.index);
      void reportImageAction(gameId, round.index);
    },
    [gameId, round.index],
  );

  const currentIndex = phase === "revealed" && result ? result.reveal.index : round.index;
  const label = `${round.facts.city}, ${round.facts.country}`;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1680px] items-center justify-between gap-4 px-4 md:h-16 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label="HOWMUCH? home" className="shrink-0">
              <Wordmark className="text-[1.35rem] md:text-[1.6rem]" />
            </Link>
            <span className="label hidden truncate text-text-muted sm:inline">{modeLabel}</span>
          </div>
          <RoundProgress rounds={rounds} current={currentIndex} className="hidden md:flex" />
          <div className="flex items-center gap-3">
            <p className="text-right leading-none" aria-label={`Score ${total}`}>
              <ScoreCounter value={total} from={prevTotal} durationMs={700} delayMs={phase === "revealed" ? 900 : 0} className="block text-heading-md font-black wdth-condensed" />
              <span className="label text-[0.625rem] text-text-muted">pts</span>
            </p>
            <Link
              href="/"
              aria-label="Leave game (you can come back to it)"
              className="inline-flex size-10 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-border-strong hover:text-text"
            >
              <X className="size-4.5" />
            </Link>
          </div>
        </div>
        <div className="flex justify-center pb-2 md:hidden">
          <RoundProgress rounds={rounds} current={currentIndex} />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1680px] flex-1 gap-5 px-4 pt-4 pb-8 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)] lg:gap-8 lg:pt-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-[calc(var(--nav-height)+24px)] lg:h-[calc(100dvh-var(--nav-height)-48px)]">
          <div className="lg:hidden">
            <PropertyHeader facts={round.facts} size="md" />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={round.index}
              initial={reduce ? false : { opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <PropertyGallery
                images={round.facts.images}
                label={label}
                globalKeys
                onImageError={reportImage}
                className="aspect-[4/3] max-h-[52vh] sm:max-h-none lg:aspect-auto lg:h-full"
                showThumbs
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div ref={panelRef} className="flex scroll-mt-28 flex-col gap-6 lg:py-2">
          <div className="hidden flex-col gap-4 lg:flex">
            <PropertyHeader facts={round.facts} size={phase === "revealed" ? "md" : "lg"} />
          </div>
          <PropertyFacts facts={round.facts} className={cn("border-y border-border py-4 lg:border-t-0 lg:pt-0", phase === "revealed" && "hidden lg:flex")} />
          <div className="lg:mt-auto">
            {phase === "guessing" || !result ? (
              <GuessPanel
                ref={inputRef}
                currency={round.facts.currency}
                digits={digits}
                onDigitsChange={(d) => {
                  setDigits(d);
                  if (error) setError(null);
                }}
                onSubmit={submit}
                lock={lock}
                error={error}
                autoFocus={initial.current?.index === round.index ? undefined : true}
              />
            ) : (
              <RevealPanel
                reveal={result.reveal}
                areaM2={round.facts.areaM2}
                isLast={result.completed || !result.next}
                onNext={next}
                nextLabel="Next home"
              />
            )}
          </div>
          <p className={cn("text-center text-body-sm text-text-muted lg:hidden", phase === "revealed" && "hidden")}>
            Total so far <span className="font-bold text-text tnum">{formatNumber(total)}</span> / {formatNumber(roundCount * 1000)}
          </p>
        </div>
      </main>
    </div>
  );
}

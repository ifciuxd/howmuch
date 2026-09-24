import { track } from "@/analytics/server";
import { db, Prisma, type GameMode, type User } from "@/database/client";
import { resultLine } from "@/game/copy";
import { utcDateKey } from "@/game/daily";
import { type HomeFacts, homeUnitValue, toHomeFacts } from "@/game/products/homes";
import { createRng, randomSeed } from "@/game/rng";
import { MAX_ROUND_SCORE, scoreGuess, summarizeRounds, type Tier } from "@/game/scoring";
import { NotEnoughItemsError, selectRounds } from "@/game/selection";
import { ROUNDS_PER_GAME, type RoundReveal } from "@/game/types";
import { MAX_GUESS } from "@/lib/format";
import { env } from "@/lib/env";
import { hasUnlimited } from "@/payments/entitlements";
import { getOrCreateDaily, nextStreak } from "./daily-service";
import { recordBest } from "./leaderboard-service";
import { loadPool } from "./pool-service";

/**
 * The server-authoritative game loop. The browser only ever receives public
 * facts before a guess; prices, scores and completion are decided here.
 */

export type GameErrorCode =
  | "NOT_ENOUGH_HOMES"
  | "QUOTA"
  | "NOT_FOUND"
  | "ALREADY_GUESSED"
  | "GAME_OVER"
  | "INVALID_GUESS"
  | "OUT_OF_ORDER";

export class GameError extends Error {
  constructor(
    public readonly code: GameErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GameError";
  }
}

export type StartGameInput = { mode: "QUICK"; firstId?: string } | { mode: "DAILY" } | { mode: "CITY"; citySlug: string } | { mode: "COUNTRY"; countryCode: string };

const RESUME_WINDOW_MS = 2 * 60 * 60 * 1000;
const RECENT_GAMES_FOR_FRESHNESS = 10;

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export interface QuotaStatus {
  used: number;
  limit: number;
  unlimited: boolean;
  remaining: number;
}

/** Free players get N non-daily games per UTC day; the Daily is always free. */
export async function quotaStatus(userId: string): Promise<QuotaStatus> {
  const [used, unlimited] = await Promise.all([
    db.game.count({ where: { userId, mode: { not: "DAILY" }, startedAt: { gte: startOfUtcDay() } } }),
    hasUnlimited(userId),
  ]);
  const limit = env.freeQuickGamesPerDay;
  return { used, limit, unlimited, remaining: unlimited ? Number.POSITIVE_INFINITY : Math.max(0, limit - used) };
}

export async function startGame(player: User, input: StartGameInput): Promise<{ gameId: string; resumed: boolean }> {
  if (input.mode === "DAILY") return startDaily(player);

  const scopeKey = input.mode === "CITY" ? input.citySlug : input.mode === "COUNTRY" ? input.countryCode.toUpperCase() : null;

  // Pressing PLAY mid-game brings you back to it rather than burning a new one.
  const active = await db.game.findFirst({
    where: { userId: player.id, mode: input.mode, scopeKey, status: "ACTIVE", startedAt: { gte: new Date(Date.now() - RESUME_WINDOW_MS) } },
    orderBy: { startedAt: "desc" },
  });
  if (active) return { gameId: active.id, resumed: true };

  const quota = await quotaStatus(player.id);
  if (!quota.unlimited && quota.remaining <= 0) {
    throw new GameError("QUOTA", "You've played all free games for today.");
  }

  const recentRounds = await db.gameRound.findMany({
    where: { game: { userId: player.id } },
    orderBy: { game: { startedAt: "desc" } },
    take: RECENT_GAMES_FOR_FRESHNESS * ROUNDS_PER_GAME,
    select: { propertyId: true },
  });
  const pool = await loadPool({
    citySlug: input.mode === "CITY" ? input.citySlug : undefined,
    countryCode: input.mode === "COUNTRY" ? input.countryCode.toUpperCase() : undefined,
  });

  // "Try this one" on the home page: that home opens the game.
  const first = input.mode === "QUICK" && input.firstId ? pool.find((p) => p.id === input.firstId) : undefined;
  let picks;
  try {
    const rest = selectRounds(first ? pool.filter((p) => p.group !== first.group && p.id !== first.id) : pool, {
      count: first ? ROUNDS_PER_GAME - 1 : ROUNDS_PER_GAME,
      mode: input.mode,
      rng: createRng(randomSeed()),
      recentIds: new Set(recentRounds.map((r) => r.propertyId)),
    });
    picks = first ? [first, ...rest] : rest;
  } catch (e) {
    if (e instanceof NotEnoughItemsError) throw new GameError("NOT_ENOUGH_HOMES", "Not enough homes here yet.");
    throw e;
  }

  const game = await db.game.create({
    data: {
      product: "HOMES",
      mode: input.mode,
      userId: player.id,
      scopeKey,
      roundCount: picks.length,
      rounds: { create: picks.map((p, index) => ({ index, propertyId: p.id })) },
    },
  });
  await track("game_started", { mode: input.mode, scope: scopeKey }, player.id);
  return { gameId: game.id, resumed: false };
}

async function startDaily(player: User): Promise<{ gameId: string; resumed: boolean }> {
  const dateKey = utcDateKey();
  const daily = await getOrCreateDaily(dateKey);
  const existing = await db.game.findUnique({ where: { userId_dailyChallengeId: { userId: player.id, dailyChallengeId: daily.id } } });
  if (existing) return { gameId: existing.id, resumed: true };
  if (daily.rounds.length < ROUNDS_PER_GAME) throw new GameError("NOT_ENOUGH_HOMES", "Today's challenge isn't ready yet.");
  try {
    const game = await db.game.create({
      data: {
        product: "HOMES",
        mode: "DAILY",
        userId: player.id,
        scopeKey: dateKey,
        dailyChallengeId: daily.id,
        roundCount: daily.rounds.length,
        rounds: { create: daily.rounds.map((r) => ({ index: r.index, propertyId: r.propertyId })) },
      },
    });
    await Promise.all([track("game_started", { mode: "DAILY", scope: dateKey }, player.id), track("daily_started", { date: dateKey }, player.id)]);
    return { gameId: game.id, resumed: false };
  } catch (e) {
    // Double click / two tabs: the unique (user, daily) constraint keeps it to one attempt.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await db.game.findUnique({ where: { userId_dailyChallengeId: { userId: player.id, dailyChallengeId: daily.id } } });
      if (again) return { gameId: again.id, resumed: true };
    }
    throw e;
  }
}

// ── Reading state ───────────────────────────────────────────────────────

export interface RoundSummary {
  index: number;
  done: boolean;
  score: number | null;
  tier: Tier | null;
}

export interface PublicRoundView {
  index: number;
  facts: HomeFacts;
}

export interface PlayState {
  game: { id: string; mode: GameMode; scopeKey: string | null; status: string; roundCount: number; totalScore: number };
  rounds: RoundSummary[];
  current: PublicRoundView | null;
}

const propertyPublicSelect = {
  city: true,
  country: true,
  countryCode: true,
  currency: true,
  areaM2: true,
  rooms: true,
  bathrooms: true,
  propertyType: true,
  floor: true,
  imageUrls: true,
  cityRef: { select: { slug: true, name: true } },
} as const;

async function loadOwnedGame(gameId: string, userId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: { rounds: { orderBy: { index: "asc" }, include: { guess: true } } },
  });
  if (!game || game.userId !== userId) throw new GameError("NOT_FOUND", "Game not found.");
  return game;
}

function summaries(rounds: Array<{ index: number; guess: { score: number; tier: string } | null }>): RoundSummary[] {
  return rounds.map((r) => ({ index: r.index, done: Boolean(r.guess), score: r.guess?.score ?? null, tier: (r.guess?.tier as Tier) ?? null }));
}

async function publicRound(roundId: string, index: number, markShown: boolean): Promise<PublicRoundView> {
  const round = await db.gameRound.findUniqueOrThrow({ where: { id: roundId }, include: { property: { select: propertyPublicSelect } } });
  if (markShown && !round.shownAt) await db.gameRound.update({ where: { id: roundId }, data: { shownAt: new Date() } });
  return { index, facts: toHomeFacts(round.property) };
}

export async function getPlayState(gameId: string, userId: string): Promise<PlayState> {
  const game = await loadOwnedGame(gameId, userId);
  const next = game.rounds.find((r) => !r.guess);
  return {
    game: { id: game.id, mode: game.mode, scopeKey: game.scopeKey, status: game.status, roundCount: game.roundCount, totalScore: game.totalScore },
    rounds: summaries(game.rounds),
    current: next && game.status === "ACTIVE" ? await publicRound(next.id, next.index, true) : null,
  };
}

// ── Guessing ────────────────────────────────────────────────────────────

export interface RevealContext {
  neighborhood: string | null;
  yearBuilt: number | null;
  sourceName: string | null;
  sourceUrl: string | null;
  insight: string | null;
  insightIsAi: boolean;
}

export interface GuessResult {
  reveal: RoundReveal & { context: RevealContext };
  totalScore: number;
  rounds: RoundSummary[];
  completed: boolean;
  next: PublicRoundView | null;
}

function buildReveal(
  index: number,
  guess: { value: number; actualValue: number; currency: string; errorPct: number; accuracy: number; score: number; tier: string; id: string },
  property: { areaM2: number | null; neighborhood: string | null; yearBuilt: number | null; sourceName: string; sourceUrl: string | null; aiInsight: string | null; isDemo: boolean },
): GuessResult["reveal"] {
  const direction = guess.value === guess.actualValue ? "exact" : guess.value > guess.actualValue ? "over" : "under";
  return {
    index,
    guess: guess.value,
    actual: guess.actualValue,
    currency: guess.currency,
    absoluteDiff: Math.abs(guess.value - guess.actualValue),
    errorPct: guess.errorPct,
    accuracy: guess.accuracy,
    score: guess.score,
    tier: guess.tier as Tier,
    direction,
    line: resultLine(guess.tier as Tier, direction, guess.id),
    unitValue: homeUnitValue(guess.actualValue, property.areaM2),
    unitLabel: property.areaM2 ? "m²" : null,
    context: {
      neighborhood: property.neighborhood,
      yearBuilt: property.yearBuilt,
      sourceName: property.isDemo ? null : property.sourceName,
      sourceUrl: property.isDemo ? null : property.sourceUrl,
      insight: property.aiInsight,
      insightIsAi: Boolean(property.aiInsight),
    },
  };
}

const revealPropertySelect = {
  price: true,
  currency: true,
  areaM2: true,
  neighborhood: true,
  yearBuilt: true,
  sourceName: true,
  sourceUrl: true,
  aiInsight: true,
  isDemo: true,
} as const;

export async function submitGuess(player: User, gameId: string, roundIndex: number, rawValue: number): Promise<GuessResult> {
  if (!Number.isInteger(rawValue) || rawValue <= 0 || rawValue > MAX_GUESS) {
    throw new GameError("INVALID_GUESS", "Enter a price above zero.");
  }
  const game = await loadOwnedGame(gameId, player.id);
  if (game.status !== "ACTIVE") throw new GameError("GAME_OVER", "This game is already finished.");
  const round = game.rounds.find((r) => r.index === roundIndex);
  if (!round) throw new GameError("NOT_FOUND", "Round not found.");

  const property = await db.property.findUniqueOrThrow({ where: { id: round.propertyId }, select: revealPropertySelect });

  if (round.guess) {
    // Double submit: return the locked result instead of scoring twice.
    return finishResponse(player.id, gameId, buildReveal(round.index, round.guess, property), false);
  }
  const firstOpen = game.rounds.find((r) => !r.guess);
  if (firstOpen && firstOpen.index !== roundIndex) throw new GameError("OUT_OF_ORDER", "Finish the current home first.");

  const result = scoreGuess(rawValue, property.price);
  const timeTakenMs = round.shownAt ? Date.now() - round.shownAt.getTime() : null;

  let completed = false;
  let guessRow;
  try {
    guessRow = await db.$transaction(async (tx) => {
      const created = await tx.guess.create({
        data: {
          roundId: round.id,
          value: rawValue,
          currency: property.currency,
          actualValue: property.price,
          errorPct: result.errorPct,
          accuracy: result.accuracy,
          score: result.score,
          tier: result.tier,
          timeTakenMs,
        },
      });
      const updated = await tx.game.update({ where: { id: gameId }, data: { totalScore: { increment: result.score } } });
      const guessedCount = game.rounds.filter((r) => r.guess).length + 1;
      if (guessedCount >= game.roundCount) {
        completed = true;
        await completeGame(tx, { ...game, totalScore: updated.totalScore }, player);
      }
      return created;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await db.guess.findUniqueOrThrow({ where: { roundId: round.id } });
      return finishResponse(player.id, gameId, buildReveal(round.index, existing, property), false);
    }
    throw e;
  }

  await flagSuspicious(player.id, gameId, result.tier, timeTakenMs);
  await track("guess_submitted", { mode: game.mode, round: roundIndex, score: result.score, tier: result.tier }, player.id);
  await track("round_completed", { mode: game.mode, round: roundIndex }, player.id);
  if (completed) {
    await track("game_completed", { mode: game.mode }, player.id);
    if (game.mode === "DAILY") await track("daily_completed", { date: game.scopeKey }, player.id);
  }
  return finishResponse(player.id, gameId, buildReveal(round.index, guessRow, property), completed);
}

async function finishResponse(userId: string, gameId: string, reveal: GuessResult["reveal"], justCompleted: boolean): Promise<GuessResult> {
  const game = await loadOwnedGame(gameId, userId);
  const next = game.rounds.find((r) => !r.guess);
  return {
    reveal,
    totalScore: game.totalScore,
    rounds: summaries(game.rounds),
    completed: justCompleted || game.status === "COMPLETED",
    // Prefetch the next home so NEXT HOME is instant (facts only — no price).
    next: next ? await publicRound(next.id, next.index, false) : null,
  };
}

async function completeGame(
  tx: Prisma.TransactionClient,
  game: { id: string; mode: GameMode; scopeKey: string | null; totalScore: number; rounds: Array<{ guess: { accuracy: number } | null }> },
  player: User,
) {
  const accuracies = await tx.guess.findMany({ where: { round: { gameId: game.id } }, select: { accuracy: true } });
  const accuracy = accuracies.reduce((s, g) => s + g.accuracy, 0) / Math.max(1, accuracies.length);
  await tx.game.update({ where: { id: game.id }, data: { status: "COMPLETED", completedAt: new Date() } });

  const board =
    game.mode === "QUICK"
      ? { scope: "GLOBAL" as const, scopeKey: "all" }
      : game.mode === "DAILY"
        ? { scope: "DAILY" as const, scopeKey: game.scopeKey ?? utcDateKey() }
        : game.mode === "CITY"
          ? { scope: "CITY" as const, scopeKey: game.scopeKey ?? "" }
          : { scope: "COUNTRY" as const, scopeKey: game.scopeKey ?? "" };
  await recordBest(tx, { ...board, userId: player.id, gameId: game.id, score: game.totalScore, accuracy });

  if (game.mode === "DAILY" && game.scopeKey) {
    const fresh = await tx.user.findUniqueOrThrow({ where: { id: player.id }, select: { lastDailyDate: true, currentStreak: true, longestStreak: true } });
    const streak = nextStreak(fresh.lastDailyDate, fresh.currentStreak, game.scopeKey);
    await tx.user.update({
      where: { id: player.id },
      data: { currentStreak: streak, longestStreak: Math.max(fresh.longestStreak, streak), lastDailyDate: game.scopeKey },
    });
  }
}

async function flagSuspicious(userId: string, gameId: string, tier: Tier, timeTakenMs: number | null) {
  const signals: string[] = [];
  if (timeTakenMs != null && timeTakenMs < 1500 && (tier === "BULLSEYE" || tier === "EXCELLENT")) signals.push("fast_accurate_guess");
  if (tier === "BULLSEYE") {
    const bullseyes = await db.guess.count({ where: { round: { gameId }, tier: "BULLSEYE" } });
    if (bullseyes >= 4) signals.push("many_bullseyes_in_game");
  }
  for (const kind of signals) {
    await db.securityEvent.create({ data: { kind, userId, details: { gameId, tier, timeTakenMs } } }).catch(() => {});
  }
}

// ── Results ─────────────────────────────────────────────────────────────

export interface ResultRound {
  index: number;
  city: string;
  country: string;
  countryCode: string;
  image: string | null;
  areaM2: number | null;
  rooms: number | null;
  price: number;
  currency: string;
  guess: number;
  score: number;
  tier: Tier;
  errorPct: number;
  accuracy: number;
  sourceName: string | null;
  sourceUrl: string | null;
}

export interface GameResults {
  id: string;
  mode: GameMode;
  scopeKey: string | null;
  status: string;
  totalScore: number;
  maxScore: number;
  averageAccuracy: number;
  averageError: number;
  rounds: ResultRound[];
  best: ResultRound | null;
  worst: ResultRound | null;
  highest: ResultRound | null;
  lowest: ResultRound | null;
  cities: string[];
  completedAt: Date | null;
}

export async function getResults(gameId: string, userId: string): Promise<GameResults> {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      rounds: {
        orderBy: { index: "asc" },
        include: {
          guess: true,
          property: { select: { city: true, country: true, countryCode: true, imageUrls: true, areaM2: true, rooms: true, sourceName: true, sourceUrl: true, isDemo: true } },
        },
      },
    },
  });
  if (!game || game.userId !== userId) throw new GameError("NOT_FOUND", "Game not found.");
  const rounds: ResultRound[] = game.rounds
    .filter((r) => r.guess)
    .map((r) => ({
      index: r.index,
      city: r.property.city,
      country: r.property.country,
      countryCode: r.property.countryCode,
      image: r.property.imageUrls[0] ?? null,
      areaM2: r.property.areaM2,
      rooms: r.property.rooms,
      price: r.guess!.actualValue,
      currency: r.guess!.currency,
      guess: r.guess!.value,
      score: r.guess!.score,
      tier: r.guess!.tier as Tier,
      errorPct: r.guess!.errorPct,
      accuracy: r.guess!.accuracy,
      sourceName: r.property.isDemo ? null : r.property.sourceName,
      sourceUrl: r.property.isDemo ? null : r.property.sourceUrl,
    }));
  const summary = summarizeRounds(rounds);
  // Compare prices across currencies only within the same currency; otherwise by raw number is misleading.
  const sameCurrency = new Set(rounds.map((r) => r.currency)).size === 1;
  const byPrice = sameCurrency ? rounds.slice().sort((a, b) => b.price - a.price) : [];
  return {
    id: game.id,
    mode: game.mode,
    scopeKey: game.scopeKey,
    status: game.status,
    totalScore: game.totalScore,
    maxScore: game.roundCount * MAX_ROUND_SCORE,
    averageAccuracy: summary.averageAccuracy,
    averageError: summary.averageError,
    rounds,
    best: rounds[summary.bestRoundIndex] ?? null,
    worst: rounds[summary.worstRoundIndex] ?? null,
    highest: byPrice[0] ?? null,
    lowest: byPrice[byPrice.length - 1] ?? null,
    cities: Array.from(new Set(rounds.map((r) => r.city))),
    completedAt: game.completedAt,
  };
}

/** Public, answer-free summary for share cards. */
export async function getShareSummary(gameId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: { user: { select: { username: true } }, rounds: { orderBy: { index: "asc" }, include: { guess: { select: { tier: true, accuracy: true } } } } },
  });
  if (!game || game.status !== "COMPLETED") return null;
  const guesses = game.rounds.map((r) => r.guess).filter(Boolean) as Array<{ tier: string; accuracy: number }>;
  return {
    mode: game.mode,
    scopeKey: game.scopeKey,
    totalScore: game.totalScore,
    maxScore: game.roundCount * MAX_ROUND_SCORE,
    accuracy: guesses.reduce((s, g) => s + g.accuracy, 0) / Math.max(1, guesses.length),
    tiers: guesses.map((g) => g.tier as Tier),
    username: game.user.username,
    completedAt: game.completedAt,
  };
}

/** Share of completed Quick Play games this player beat in the last 30 days (only with enough data). */
export async function quickPlayPercentile(score: number, excludeGameId: string): Promise<number | null> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const where = { mode: "QUICK" as const, status: "COMPLETED" as const, completedAt: { gte: since }, id: { not: excludeGameId } };
  const total = await db.game.count({ where });
  if (total < 50) return null;
  const below = await db.game.count({ where: { ...where, totalScore: { lt: score } } });
  return Math.round((below / total) * 100);
}

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { track } from "@/analytics/server";
import { db } from "@/database/client";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { GameError, type GuessResult, type StartGameInput, startGame, submitGuess } from "@/services/game-service";
import { BannedError, getCurrentUser, getOrCreatePlayer } from "@/services/user-service";

/** Start (or resume) a game, then navigate to it. Used by every PLAY button as a form action. */
export async function startGameAction(formData: FormData): Promise<void> {
  const mode = String(formData.get("mode") ?? "QUICK").toUpperCase();
  const scope = String(formData.get("scope") ?? "");
  const ip = clientIp(await headers());
  if (!rateLimit(`start:${ip}`, 30, 60_000).ok) redirect("/play?error=slow-down");

  let input: StartGameInput;
  if (mode === "DAILY") input = { mode: "DAILY" };
  else if (mode === "CITY" && scope) input = { mode: "CITY", citySlug: scope };
  else if (mode === "COUNTRY" && /^[A-Za-z]{2}$/.test(scope)) input = { mode: "COUNTRY", countryCode: scope };
  else {
    const first = String(formData.get("first") ?? "");
    input = { mode: "QUICK", firstId: /^[a-z0-9]{10,40}$/.test(first) ? first : undefined };
  }

  let target: string;
  try {
    const player = await getOrCreatePlayer();
    const { gameId } = await startGame(player, input);
    target = `/game/${gameId}`;
  } catch (e) {
    if (e instanceof BannedError) target = "/profile?error=banned";
    else if (e instanceof GameError && e.code === "QUOTA") target = "/pass?reason=limit";
    else if (e instanceof GameError && e.code === "NOT_ENOUGH_HOMES") target = `/play?error=empty${scope ? `&scope=${encodeURIComponent(scope)}` : ""}`;
    else {
      console.error("[startGameAction]", e);
      target = "/play?error=server";
    }
  }
  redirect(target);
}

const guessSchema = z.object({
  gameId: z.string().min(10).max(40),
  roundIndex: z.number().int().min(0).max(20),
  value: z.number().int().positive(),
});

export type GuessActionResult = { ok: true; result: GuessResult } | { ok: false; code: string; error: string };

export async function submitGuessAction(gameId: string, roundIndex: number, value: number): Promise<GuessActionResult> {
  const parsed = guessSchema.safeParse({ gameId, roundIndex, value });
  if (!parsed.success) return { ok: false, code: "INVALID_GUESS", error: "Enter a price above zero." };
  const player = await getCurrentUser();
  if (!player) return { ok: false, code: "NOT_FOUND", error: "This game has expired. Start a new one." };
  if (player.bannedAt) return { ok: false, code: "BANNED", error: "This account can't play right now." };
  if (!rateLimit(`guess:${player.id}`, 20, 10_000).ok) return { ok: false, code: "RATE", error: "Easy there — one guess at a time." };
  try {
    const result = await submitGuess(player, parsed.data.gameId, parsed.data.roundIndex, parsed.data.value);
    return { ok: true, result };
  } catch (e) {
    if (e instanceof GameError) return { ok: false, code: e.code, error: e.message };
    console.error("[submitGuessAction]", e);
    return { ok: false, code: "SERVER", error: "Something went wrong on our side. Try again." };
  }
}

/** A photo failed to load in a player's browser. Enough reports take the home out of rotation. */
export async function reportImageAction(gameId: string, roundIndex: number): Promise<void> {
  const player = await getCurrentUser();
  if (!player || !rateLimit(`img:${player.id}`, 10, 60_000).ok) return;
  const round = await db.gameRound.findFirst({ where: { gameId, index: roundIndex, game: { userId: player.id } }, select: { propertyId: true } });
  if (!round) return;
  await db.property.update({ where: { id: round.propertyId }, data: { brokenImageReports: { increment: 1 } } });
  await track("image_failed", { round: roundIndex }, player.id);
}

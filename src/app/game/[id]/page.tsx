import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { GameClient } from "@/components/game/game-client";
import { modeLabel } from "@/lib/mode-label";
import { GameError, getPlayState } from "@/services/game-service";
import { getCurrentUser } from "@/services/user-service";

export const metadata: Metadata = { title: "Playing", robots: { index: false } };

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getCurrentUser();
  if (!player) notFound();
  let state;
  try {
    state = await getPlayState(id, player.id);
  } catch (e) {
    if (e instanceof GameError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  if (!state.current) redirect(`/game/${id}/results`);
  return <GameClient initial={state} modeLabel={await modeLabel(state.game.mode, state.game.scopeKey)} />;
}

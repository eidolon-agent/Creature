"use client";

import { useFarcasterUser } from "@/neynar-farcaster-sdk/mini";
import { PixiGame } from "@/features/game/components/pixi-game";

export function GameTab() {
  const { data: user } = useFarcasterUser();

  // Derive name immediately — never block mounting on user loading
  const playerName = user?.username
    ? `@${user.username}`
    : user?.fid
    ? `FID:${user.fid}`
    : "Adventurer";

  return (
    <div className="w-full h-full">
      <PixiGame playerName={playerName} />
    </div>
  );
}

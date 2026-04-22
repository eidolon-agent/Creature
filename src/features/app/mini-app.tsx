"use client";

import { useFarcasterUser } from "@/neynar-farcaster-sdk/mini";
import { MmoGame } from "@/features/mmo/client/mmo-game";

export function MiniApp() {
  const { data: user } = useFarcasterUser();

  const fid        = user?.fid        ?? 0;
  const playerName = user?.username
    ? `@${user.username}`
    : user?.fid
    ? `Hero#${user.fid}`
    : "Adventurer";

  return (
    <div className="h-dvh w-full overflow-hidden" style={{ background: "#0a1208" }}>
      <MmoGame fid={fid} playerName={playerName} initialZone="prontera" />
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getWorld } from "@/features/mmo/server/game-world";
import type { ZoneId } from "@/features/mmo/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId") ?? "";
  const zone     = (searchParams.get("zone") ?? "prontera") as ZoneId;
  const vx       = parseInt(searchParams.get("vx") ?? "20");
  const vy       = parseInt(searchParams.get("vy") ?? "20");

  const world = getWorld();

  // Auto-register player if provided
  const fid  = parseInt(searchParams.get("fid") ?? "0");
  const name = searchParams.get("name") ?? "Adventurer";
  if (fid > 0) world.addPlayer(fid, name, zone);

  const snapshot = world.getSnapshot(zone, vx, vy);
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}

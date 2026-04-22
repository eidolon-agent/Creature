import { NextRequest, NextResponse } from "next/server";
import { getWorld } from "@/features/mmo/server/game-world";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { playerId, destX, destY } = body;
  if (!playerId || destX == null || destY == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  getWorld().queueMove(playerId, Math.round(destX), Math.round(destY));
  return NextResponse.json({ ok: true });
}

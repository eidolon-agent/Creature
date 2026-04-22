import { NextRequest, NextResponse } from "next/server";
import { getWorld } from "@/features/mmo/server/game-world";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { playerId, targetId } = body;
  if (!playerId || !targetId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  getWorld().queueAttack(playerId, targetId);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getWorld } from "@/features/mmo/server/game-world";
import type { ZoneId } from "@/features/mmo/types";

export async function GET(req: NextRequest) {
  const zone = (new URL(req.url).searchParams.get("zone") ?? "prontera") as ZoneId;
  const grid = getWorld().getZoneTilemap(zone);
  return NextResponse.json({ grid }, {
    headers: { "Cache-Control": "public, max-age=3600" }, // tilemap is static
  });
}

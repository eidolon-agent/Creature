import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getRecentBattleLog, submitScore, logBattleEvent } from "@/db/actions/leaderboard-actions";

export async function GET() {
  try {
    const [board, feed] = await Promise.all([getLeaderboard(), getRecentBattleLog()]);
    return NextResponse.json({ board, feed });
  } catch (err) {
    console.error("[leaderboard GET]", err);
    return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "submit_score") {
      await submitScore({
        fid:              body.fid,
        username:         body.username,
        displayName:      body.displayName,
        avatarUrl:        body.avatarUrl,
        questDelta:       body.questDelta       ?? 0,
        winsDelta:        body.winsDelta        ?? 0,
        bossKillsDelta:   body.bossKillsDelta   ?? 0,
        level:            body.level            ?? 1,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "log_event") {
      await logBattleEvent({
        fid:       body.fid,
        username:  body.username,
        eventType: body.eventType,
        detail:    body.detail    ?? "",
        questGain: body.questGain ?? 0,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[leaderboard POST]", err);
    return NextResponse.json({ error: "Failed to submit score" }, { status: 500 });
  }
}

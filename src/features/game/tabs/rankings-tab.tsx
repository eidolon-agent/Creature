"use client";

import { useState } from "react";
import { useLeaderboard } from "@/features/game/hooks/use-leaderboard";
import { useFarcasterUser } from "@/neynar-farcaster-sdk/mini";
import type { PlayerScore, BattleLogEntry } from "@/db/actions/leaderboard-actions";

// ─── Helpers ──────────────────────────────────────────────────────────────

function rankMedal(i: number) {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return null;
}

function rankBg(i: number): string {
  if (i === 0) return "rgba(234,179,8,0.13)";
  if (i === 1) return "rgba(148,163,184,0.1)";
  if (i === 2) return "rgba(180,83,9,0.11)";
  return "transparent";
}

function rankBorder(i: number): string {
  if (i === 0) return "1px solid rgba(234,179,8,0.3)";
  if (i === 1) return "1px solid rgba(148,163,184,0.2)";
  if (i === 2) return "1px solid rgba(180,83,9,0.25)";
  return "1px solid transparent";
}

function eventStyle(type: string): { icon: string; color: string; label: string } {
  switch (type) {
    case "boss_kill":      return { icon: "💀", color: "#f87171", label: "Boss Kill" };
    case "pvp_kill":       return { icon: "⚔️", color: "#fb923c", label: "PvP Kill" };
    case "level_up":       return { icon: "✨", color: "#60a5fa", label: "Level Up" };
    case "quest_complete": return { icon: "📜", color: "#34d399", label: "Quest" };
    default:               return { icon: "🎮", color: "#9ca3af", label: type };
  }
}

function timeAgo(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 60_000)     return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000)  return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

// ─── Row components ───────────────────────────────────────────────────────

function BoardRow({ entry, rank, isMe }: { entry: PlayerScore; rank: number; isMe: boolean }) {
  const medal = rankMedal(rank);
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{
        background: isMe ? "rgba(52,211,153,0.12)" : rankBg(rank),
        border: isMe ? "1px solid rgba(52,211,153,0.35)" : rankBorder(rank),
      }}
    >
      {/* Rank */}
      <div className="w-8 text-center shrink-0">
        {medal
          ? <span className="text-lg leading-none">{medal}</span>
          : <span className="text-gray-500 text-sm font-bold tabular-nums">#{rank + 1}</span>
        }
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden bg-gray-800 flex items-center justify-center text-lg">
        {entry.avatarUrl
          ? <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
          : "🧝"
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-white text-sm font-bold truncate">
            {entry.displayName || entry.username}
          </span>
          {isMe && (
            <span
              className="text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0"
              style={{ background: "rgba(52,211,153,0.2)", color: "#34d399" }}
            >
              YOU
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-gray-500 text-[10px]">Lv {entry.level}</span>
          <span className="text-gray-700 text-[10px]">·</span>
          <span className="text-orange-400 text-[10px]">💀 {entry.bossKills}</span>
          <span className="text-gray-700 text-[10px]">·</span>
          <span className="text-blue-400 text-[10px]">⚔️ {entry.battleWins}</span>
        </div>
      </div>

      {/* Score */}
      <div className="text-right shrink-0">
        <div className="text-emerald-400 font-black text-sm tabular-nums">
          {entry.questEarned.toLocaleString()}
        </div>
        <div className="text-gray-600 text-[10px]">QUEST</div>
      </div>
    </div>
  );
}

function FeedRow({ entry }: { entry: BattleLogEntry }) {
  const { icon, color, label } = eventStyle(entry.eventType);
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-gray-800/40 last:border-0">
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-white text-xs font-semibold">{entry.username}</span>
        <span className="text-gray-600 text-xs"> · </span>
        <span className="text-xs font-medium" style={{ color }}>{label}</span>
        {entry.detail && (
          <div className="text-gray-500 text-[11px] mt-0.5 truncate">{entry.detail}</div>
        )}
      </div>
      <div className="text-right shrink-0">
        {entry.questGain > 0 && (
          <div className="text-emerald-400 text-[11px] font-bold tabular-nums">+{entry.questGain}</div>
        )}
        <div className="text-gray-600 text-[10px]">{timeAgo(entry.createdAt)}</div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(55,65,81,0.35)" }} />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

type Tab = "board" | "feed";

export function RankingsTab() {
  const { board, feed, loading, error, refetch } = useLeaderboard(15_000);
  const { data: user } = useFarcasterUser();
  const myFid    = user?.fid ?? null;

  const [tab, setTab] = useState<Tab>("board");

  const myRank  = myFid != null ? board.findIndex((e) => e.fid === myFid) : -1;
  const myEntry = myRank >= 0 ? board[myRank] : null;

  return (
    <div className="space-y-4">

      {/* Header card */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(16,185,129,0.12))",
          border: "1px solid rgba(124,58,237,0.28)",
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-white font-black text-base">🏆 Global Rankings</div>
            <div className="text-gray-400 text-xs mt-0.5">
              Top QUEST earners · refreshes every 15s
            </div>
          </div>
          <button
            onClick={refetch}
            className="text-gray-400 hover:text-white active:scale-90 transition-all text-xl"
          >
            🔄
          </button>
        </div>

        {/* Player's own rank callout */}
        {myEntry && (
          <div
            className="mt-3 rounded-lg px-3 py-2 flex items-center justify-between"
            style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.22)" }}
          >
            <div>
              <div className="text-emerald-400 text-[10px] font-black tracking-wider">YOUR RANK</div>
              <div className="text-white font-black text-xl tabular-nums">
                #{myRank + 1}
                <span className="text-gray-500 text-sm font-normal ml-1">/ {board.length}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-gray-500 text-[10px]">Total QUEST</div>
              <div className="text-emerald-400 font-black text-base tabular-nums">
                {myEntry.questEarned.toLocaleString()}
              </div>
              <div className="text-gray-600 text-[10px] tabular-nums">
                💀 {myEntry.bossKills} · ⚔️ {myEntry.battleWins}
              </div>
            </div>
          </div>
        )}

        {!myEntry && !loading && (
          <div className="mt-2 text-gray-500 text-xs">
            Activate agents to earn QUEST and appear on the board.
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: "rgba(17,24,39,0.55)" }}>
        {(["board", "feed"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: tab === t ? "rgba(52,211,153,0.18)" : "transparent",
              color:      tab === t ? "#34d399" : "#6b7280",
              border:     tab === t ? "1px solid rgba(52,211,153,0.28)" : "1px solid transparent",
            }}
          >
            {t === "board" ? "🏆 Rankings" : "⚔️ Activity"}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl p-3 text-sm text-red-300"
          style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)" }}
        >
          ⚠️ {error} —{" "}
          <button onClick={refetch} className="underline hover:text-red-200">retry</button>
        </div>
      )}

      {/* Rankings board */}
      {tab === "board" && (
        loading ? <Skeleton /> :
        board.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="text-5xl mb-3">🏆</div>
            <div className="text-white font-black text-lg mb-1">No scores yet!</div>
            <div className="text-gray-400 text-sm max-w-[220px]">
              Deploy your agents and farm QUEST to claim the first spot.
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {board.map((entry, i) => (
              <BoardRow key={entry.fid} entry={entry} rank={i} isMe={entry.fid === myFid} />
            ))}
          </div>
        )
      )}

      {/* Activity feed */}
      {tab === "feed" && (
        loading ? <Skeleton /> :
        feed.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="text-4xl mb-2">⚔️</div>
            <div className="text-gray-400 text-sm">
              No battles logged yet. Boss kills and PvP events appear here.
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl px-3 py-1"
            style={{ background: "rgba(17,24,39,0.5)", border: "1px solid rgba(55,65,81,0.35)" }}
          >
            {feed.map((entry) => (
              <FeedRow key={entry.id} entry={entry} />
            ))}
          </div>
        )
      )}

      <div className="text-center text-gray-700 text-[10px] pb-2">
        Top 50 players · Scores accumulate across all sessions
      </div>
    </div>
  );
}

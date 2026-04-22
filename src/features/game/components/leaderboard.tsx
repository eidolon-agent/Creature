"use client";

import { Card, CardContent } from "@neynar/ui";
import type { LeaderboardEntry, AgentStrategy } from "@/features/game/types";

const STRATEGY_ICONS: Record<AgentStrategy, string> = {
  farming:   "🌾",
  hunting:   "⚔️",
  exploring: "🗺️",
};

const CLASS_COLORS: Record<string, string> = {
  beast:   "text-orange-400",
  plant:   "text-emerald-400",
  aqua:    "text-cyan-400",
  bug:     "text-lime-400",
  reptile: "text-teal-400",
};

const RANK_STYLES: Record<number, string> = {
  1: "text-yellow-400 font-black text-base",
  2: "text-gray-300 font-bold",
  3: "text-amber-600 font-bold",
};

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-300 text-sm font-semibold">Top Agents by Earnings</span>
        <span className="text-gray-500 text-xs">All time</span>
      </div>

      {entries.map((entry) => (
        <LeaderboardRow key={entry.agentId} entry={entry} />
      ))}
    </div>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const rankStyle = RANK_STYLES[entry.rank] ?? "text-gray-500 font-medium";
  const isTop3 = entry.rank <= 3;

  return (
    <Card className={`
      border transition-all
      ${isTop3
        ? "border-yellow-900/50 bg-yellow-950/20"
        : "border-gray-800/60 bg-gray-900/60"
      }
    `}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Rank */}
          <div className={`w-7 text-center flex-shrink-0 ${rankStyle}`}>
            {entry.rank <= 3 ? entry.ownerAvatar : `#${entry.rank}`}
          </div>

          {/* Owner info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-white font-semibold text-sm truncate">{entry.ownerName}</span>
              <span className="text-gray-500 text-xs">•</span>
              <span className={`text-xs font-semibold capitalize ${CLASS_COLORS[entry.creatureClass]}`}>
                {entry.creatureName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-xs">LV {entry.level}</span>
              <span className="text-gray-500 text-xs">•</span>
              <span className="text-gray-400 text-xs">
                {STRATEGY_ICONS[entry.strategy]} {entry.strategy}
              </span>
              <span className="text-gray-500 text-xs">•</span>
              <span className="text-blue-400 text-xs">{entry.battlesWon.toLocaleString()} wins</span>
            </div>
          </div>

          {/* Earnings */}
          <div className="text-right flex-shrink-0">
            <div className="text-emerald-400 font-bold text-sm">
              {(entry.tokensEarned / 1000).toFixed(1)}k
            </div>
            <div className="text-gray-500 text-xs">QUEST</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

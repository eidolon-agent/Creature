"use client";

import { Card, CardContent } from "@neynar/ui";
import type { Creature } from "@/features/game/types";

const RARITY_STYLES: Record<string, { border: string; badge: string; glow: string }> = {
  common:    { border: "border-gray-600",   badge: "bg-gray-700 text-gray-300",      glow: "" },
  rare:      { border: "border-blue-500",   badge: "bg-blue-900/80 text-blue-300",   glow: "shadow-blue-500/20" },
  epic:      { border: "border-purple-500", badge: "bg-purple-900/80 text-purple-300", glow: "shadow-purple-500/30 shadow-lg" },
  legendary: { border: "border-yellow-400", badge: "bg-yellow-900/80 text-yellow-300", glow: "shadow-yellow-400/40 shadow-xl" },
};

const CLASS_COLORS: Record<string, string> = {
  beast:   "text-orange-400",
  plant:   "text-emerald-400",
  aqua:    "text-cyan-400",
  bug:     "text-lime-400",
  reptile: "text-teal-400",
};

interface CreatureCardProps {
  creature: Creature;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  compact?: boolean;
}

export function CreatureCard({ creature, isSelected, onSelect, compact }: CreatureCardProps) {
  const rarity = RARITY_STYLES[creature.rarity];
  const hpPercent = (creature.stats.hp / creature.stats.maxHp) * 100;
  const expPercent = (creature.exp / creature.expToNext) * 100;

  return (
    <Card
      className={`
        border transition-all duration-200 cursor-pointer
        bg-gray-900/80 backdrop-blur-sm
        ${rarity.border} ${rarity.glow}
        ${isSelected ? "ring-2 ring-white/30 scale-[1.01]" : "hover:scale-[1.005]"}
      `}
      onClick={() => onSelect?.(creature.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Creature icon */}
          <div className={`
            flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-3xl
            bg-gray-800 border ${rarity.border}
            ${creature.rarity === "legendary" ? "animate-pulse" : ""}
          `}>
            {creature.imageEmoji}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-bold text-white text-sm truncate">{creature.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${rarity.badge}`}>
                {creature.rarity.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold capitalize ${CLASS_COLORS[creature.class]}`}>
                {creature.class}
              </span>
              <span className="text-gray-500 text-xs">•</span>
              <span className="text-yellow-400 text-xs font-bold">LV {creature.level}</span>
              {creature.isEvolved && (
                <span className="text-xs bg-indigo-900/80 text-indigo-300 px-1.5 py-0.5 rounded">★ Evolved</span>
              )}
            </div>

            {/* HP Bar */}
            <div className="mb-1.5">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-400">HP</span>
                <span className="text-white">{creature.stats.hp}/{creature.stats.maxHp}</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${hpPercent}%`,
                    background: hpPercent > 60 ? "#10b981" : hpPercent > 30 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
            </div>

            {/* EXP Bar */}
            <div>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${expPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        {!compact && (
          <div className="grid grid-cols-4 gap-1 mt-3">
            {[
              { label: "ATK", value: creature.stats.attack, color: "text-red-400" },
              { label: "DEF", value: creature.stats.defense, color: "text-blue-400" },
              { label: "SPD", value: creature.stats.speed, color: "text-yellow-400" },
              { label: "Breeds", value: `${creature.breedCount}/${creature.maxBreeds}`, color: "text-pink-400" },
            ].map((stat) => (
              <div key={stat.label} className="text-center bg-gray-800/60 rounded-lg py-1.5 px-1">
                <div className={`text-xs font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-gray-500 text-xs leading-none mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

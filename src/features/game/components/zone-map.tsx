"use client";

import type { ZoneId, ZoneInfo } from "@/features/game/types";

interface ZoneMapProps {
  zones: ZoneInfo[];
  activeZone?: ZoneId;
  onZoneSelect?: (zoneId: ZoneId) => void;
}

const DIFFICULTY_BADGE: Record<string, { label: string; color: string }> = {
  easy:    { label: "Easy",    color: "bg-emerald-900/80 text-emerald-300" },
  medium:  { label: "Medium",  color: "bg-yellow-900/80 text-yellow-300" },
  hard:    { label: "Hard",    color: "bg-orange-900/80 text-orange-300" },
  extreme: { label: "Extreme", color: "bg-red-900/80 text-red-300" },
};

export function ZoneMap({ zones, activeZone, onZoneSelect }: ZoneMapProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {zones.map((zone) => (
        <ZoneCard
          key={zone.id}
          zone={zone}
          isActive={zone.id === activeZone}
          onSelect={onZoneSelect}
        />
      ))}
    </div>
  );
}

function ZoneCard({
  zone,
  isActive,
  onSelect,
}: {
  zone: ZoneInfo;
  isActive?: boolean;
  onSelect?: (id: ZoneId) => void;
}) {
  const diff = DIFFICULTY_BADGE[zone.difficulty];

  return (
    <button
      onClick={() => onSelect?.(zone.id)}
      className={`
        relative text-left rounded-xl p-3 border transition-all duration-200
        bg-gradient-to-br ${zone.bgColor}
        ${isActive
          ? "border-white/40 ring-2 ring-white/20 scale-[1.02]"
          : "border-gray-700/50 hover:border-gray-600/70 hover:scale-[1.01]"
        }
      `}
    >
      {/* Zone icon */}
      <div className="text-2xl mb-1.5">{zone.icon}</div>

      {/* Zone name */}
      <div className="text-white font-bold text-xs leading-tight mb-1">{zone.name}</div>

      {/* Difficulty badge */}
      <div className={`text-xs px-1.5 py-0.5 rounded inline-block mb-1.5 ${diff.color}`}>
        {diff.label}
      </div>

      {/* Active agents */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400">🤖</span>
        <span className="text-xs text-gray-300">{zone.activeAgents} agents</span>
      </div>

      {/* Token multiplier */}
      {zone.tokenMultiplier > 0 && (
        <div className="absolute top-2 right-2 text-xs text-yellow-400 font-bold bg-black/40 rounded px-1">
          ×{zone.tokenMultiplier}
        </div>
      )}

      {/* Min level */}
      {zone.minLevel > 0 && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
          LV{zone.minLevel}+
        </div>
      )}
    </button>
  );
}

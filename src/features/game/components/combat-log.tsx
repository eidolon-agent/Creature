"use client";

import { useEffect, useRef, useState } from "react";
import type { CombatEvent } from "@/features/game/types";
import { CombatEffects } from "@/features/game/components/combat-effects";

// Client-only timestamp — avoids SSR/hydration mismatch from Date.now()
function useTimeAgo(ts: number): string {
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    function calc() {
      const secs = Math.floor((Date.now() - ts) / 1000);
      if (secs < 60) return `${secs}s ago`;
      const mins = Math.floor(secs / 60);
      if (mins < 60) return `${mins}m ago`;
      return `${Math.floor(mins / 60)}h ago`;
    }
    setLabel(calc());
    const interval = setInterval(() => setLabel(calc()), 10000);
    return () => clearInterval(interval);
  }, [ts]);

  return label;
}

interface CombatLogProps {
  events: CombatEvent[];
}

export function CombatLog({ events }: CombatLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [newestId, setNewestId] = useState<string | null>(null);

  // Track the newest event for effects
  const latestEvent = events[0] ?? null;

  useEffect(() => {
    if (latestEvent) setNewestId(latestEvent.id);
  }, [latestEvent?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [events.length]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-300 text-sm font-semibold">Combat Log</span>
        <span className="text-gray-500 text-xs">{events.length} events</span>
      </div>

      {/* Relative container so floats + flash are positioned inside it */}
      <div ref={containerRef} className="relative rounded-xl">
        {/* Live effects overlay */}
        <CombatEffects latestEvent={latestEvent} containerRef={containerRef} />

        <div ref={scrollRef} className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
          {events.map((event, i) => (
            <CombatEventRow
              key={event.id}
              event={event}
              isNew={i === 0 && event.id === newestId}
            />
          ))}

          {events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-3xl mb-2">⚔️</div>
              <div className="text-gray-400 text-sm">No combat yet</div>
              <div className="text-gray-600 text-xs mt-1">Activate an agent to start farming</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CombatEventRow({ event, isNew }: { event: CombatEvent; isNew: boolean }) {
  const zoneIcons: Record<string, string> = {
    forest: "🌲", cave: "🪨", dungeon: "💀", town: "🏘️",
  };

  const timeLabel = useTimeAgo(event.timestamp);
  const isBoss = !!event.isBossKill;

  if (isBoss) {
    return (
      <div
        className={`
          flex items-start gap-2 p-2.5 rounded-lg text-xs
          bg-gradient-to-r from-purple-950/80 to-violet-950/60
          border border-purple-600/60
          ${isNew ? "boss-row-enter" : ""}
        `}
        style={{ boxShadow: "0 0 12px rgba(139,92,246,0.3)" }}
      >
        <span className="text-xl flex-shrink-0" style={{ filter: "drop-shadow(0 0 6px rgba(139,92,246,0.8))" }}>
          💀
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-purple-200 font-black text-xs leading-tight">
            BOSS SLAIN — {event.target}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-yellow-300 font-bold" style={{ textShadow: "0 0 8px rgba(251,191,36,0.8)" }}>
              ✨ {event.isCrit && "CRIT "}-{event.damage.toLocaleString()} dmg
            </span>
            {event.skillUsed && (
              <span className="text-purple-300">{event.skillUsed}</span>
            )}
          </div>
          {event.tokensEarned > 0 && (
            <div
              className="mt-0.5 text-emerald-300 font-black"
              style={{ textShadow: "0 0 8px rgba(52,211,153,0.7)" }}
            >
              +{event.tokensEarned.toLocaleString()} QUEST 💎
            </div>
          )}
          {event.lootDrops && event.lootDrops.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {event.lootDrops
                .filter((d) => d.type !== "token")
                .map((d, i) => (
                  <span
                    key={i}
                    className="text-xs px-1.5 py-0.5 rounded font-semibold"
                    style={{
                      background: "rgba(124,58,237,0.4)",
                      border: "1px solid rgba(139,92,246,0.5)",
                      color: "#c4b5fd",
                    }}
                  >
                    {d.icon} {d.name}
                  </span>
                ))}
            </div>
          )}
        </div>
        <span className="text-gray-500 flex-shrink-0 text-xs" suppressHydrationWarning>
          {timeLabel}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`
        flex items-start gap-2 p-2 rounded-lg text-xs
        ${event.targetDied ? "bg-gray-800/80" : "bg-gray-900/50"}
        border ${event.isCrit ? "border-yellow-700/50" : event.targetDied ? "border-gray-700/60" : "border-gray-800/40"}
        ${isNew ? "combat-row-new" : ""}
      `}
    >
      <span className="text-base flex-shrink-0 mt-0.5">{zoneIcons[event.zone] ?? "🗺️"}</span>

      <div className="flex-1 min-w-0">
        <div className="text-gray-100">
          <span className="text-cyan-300 font-semibold">{event.attacker}</span>
          <span className="text-gray-400"> hit </span>
          <span className="text-red-300">{event.target}</span>
          {event.skillUsed && (
            <span className="text-gray-400">
              {" "}with <span className="text-purple-300">{event.skillUsed}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span
            className={`font-bold ${event.isCrit ? "text-yellow-300" : "text-white"}`}
            style={event.isCrit ? { textShadow: "0 0 8px rgba(251,191,36,0.7)" } : undefined}
          >
            {event.isCrit && "✨ "}
            -{event.damage} dmg
          </span>
          {event.targetDied && <span className="text-red-400 font-semibold">☠️ KO</span>}
          {event.tokensEarned > 0 && (
            <span
              className="text-emerald-400 font-semibold"
              style={{ textShadow: "0 0 6px rgba(52,211,153,0.5)" }}
            >
              +{event.tokensEarned.toFixed(1)} QUEST
            </span>
          )}
        </div>
      </div>

      <span className="text-gray-600 flex-shrink-0 text-xs" suppressHydrationWarning>
        {timeLabel}
      </span>
    </div>
  );
}

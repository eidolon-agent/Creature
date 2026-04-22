"use client";

import { useEffect, useState } from "react";
import type { BossState, LootDrop } from "@/features/game/types";

interface DungeonBossProps {
  boss: BossState | null;
  lastLoot: LootDrop[] | null;
  onLootDismiss: () => void;
}

const LEGENDARY_LOOT: LootDrop[] = [
  { type: "material", name: "Void Dragon Scale", amount: 1, icon: "🐉" },
  { type: "material", name: "Abyssal Core", amount: 1, icon: "🔮" },
  { type: "token",    name: "QUEST",          amount: 0,  icon: "💰" }, // amount set at runtime
  { type: "equipment", name: "Shadow Fang Relic", amount: 1, icon: "⚔️" },
];

export const DUNGEON_BOSSES = [
  { name: "Malachar the Void Drake",  icon: "🐲", maxHp: 8400  },
  { name: "Skarn the Bone Colossus",  icon: "💀", maxHp: 11200 },
  { name: "Nyxara, Shadow Empress",   icon: "👁️", maxHp: 9600  },
  { name: "Goreth the Abyssal Titan", icon: "🦷", maxHp: 13000 },
] as const;

// ─── HP Bar ────────────────────────────────────────────────────────────────

function BossHpBar({ boss }: { boss: BossState }) {
  const pct = Math.max(0, (boss.currentHp / boss.maxHp) * 100);
  const enraged = boss.phase === 2;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-bold ${enraged ? "text-red-400 animate-pulse" : "text-purple-300"}`}>
          {enraged && "⚡ ENRAGED — "}
          {boss.name}
        </span>
        <span className="text-gray-400 font-mono">
          {boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()}
        </span>
      </div>
      <div className="h-3 rounded-full bg-gray-900/80 overflow-hidden border border-gray-700/50">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: enraged
              ? "linear-gradient(90deg, #dc2626, #f87171)"
              : "linear-gradient(90deg, #7c3aed, #a78bfa)",
            boxShadow: enraged
              ? "0 0 10px rgba(239,68,68,0.6)"
              : "0 0 10px rgba(139,92,246,0.6)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Loot Fanfare ──────────────────────────────────────────────────────────

function LootFanfare({ drops, onDismiss }: { drops: LootDrop[]; onDismiss: () => void }) {
  // Auto-dismiss after 4s
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-xl"
      style={{
        background: "radial-gradient(ellipse at center, rgba(124,58,237,0.25) 0%, rgba(7,13,26,0.95) 70%)",
        animation: "fanfareIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      }}
      onClick={onDismiss}
    >
      <div
        className="text-center px-4"
        style={{ animation: "floatUp 0.5s ease-out forwards" }}
      >
        <div className="text-4xl mb-1">💎</div>
        <div
          className="text-yellow-300 font-black text-lg mb-0.5"
          style={{ textShadow: "0 0 20px rgba(251,191,36,0.9)" }}
        >
          BOSS SLAIN!
        </div>
        <div className="text-purple-300 text-xs font-semibold mb-3">
          Legendary Loot Dropped
        </div>

        <div className="space-y-1.5">
          {drops.map((drop, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-purple-950/80 border border-purple-700/50 rounded-lg px-3 py-1.5"
              style={{
                animation: `floatUp 0.4s ease-out ${0.1 + i * 0.08}s both`,
                boxShadow: "0 0 12px rgba(139,92,246,0.4)",
              }}
            >
              <span className="text-lg">{drop.icon}</span>
              <span className="text-white text-sm font-semibold">
                {drop.name}
                {drop.type === "token" && (
                  <span className="text-yellow-300 font-black"> +{drop.amount.toLocaleString()}</span>
                )}
                {drop.type !== "token" && drop.amount > 1 && (
                  <span className="text-gray-400"> ×{drop.amount}</span>
                )}
              </span>
              {drop.type === "token" && (
                <span className="text-gray-400 text-xs ml-auto">QUEST</span>
              )}
              {drop.type !== "token" && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded ml-auto font-bold"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                    color: "white",
                    boxShadow: "0 0 8px rgba(139,92,246,0.5)",
                  }}
                >
                  LEGENDARY
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="text-gray-500 text-xs mt-3">Tap to dismiss</div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function DungeonBoss({ boss, lastLoot, onLootDismiss }: DungeonBossProps) {
  const [showRespawn, setShowRespawn] = useState(false);
  const [respawnSecs, setRespawnSecs] = useState(0);

  // After boss dies (boss becomes null), show respawn countdown
  useEffect(() => {
    if (!boss && lastLoot) {
      setShowRespawn(true);
      setRespawnSecs(30);
      const interval = setInterval(() => {
        setRespawnSecs((s) => {
          if (s <= 1) { clearInterval(interval); setShowRespawn(false); return 0; }
          return s - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [boss, lastLoot]);

  if (!boss && !showRespawn) {
    return (
      <div className="border border-dashed border-purple-800/40 rounded-xl p-3 text-center">
        <div className="text-2xl mb-1">🔮</div>
        <div className="text-purple-300 text-xs font-semibold">Boss Awaits</div>
        <div className="text-gray-500 text-xs mt-0.5">Send a dungeon agent to trigger a boss encounter</div>
      </div>
    );
  }

  if (showRespawn && !boss) {
    return (
      <div className="border border-purple-800/40 rounded-xl p-3 text-center bg-purple-950/30">
        <div className="text-2xl mb-1">⏳</div>
        <div className="text-purple-300 text-xs font-semibold">Boss Respawning</div>
        <div className="text-gray-400 text-xs mt-0.5">
          Next encounter in <span className="text-yellow-400 font-bold">{respawnSecs}s</span>
        </div>
      </div>
    );
  }

  if (!boss) return null;

  return (
    <div className="relative border border-purple-700/50 rounded-xl p-3 bg-gradient-to-br from-purple-950/60 to-violet-950/60 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top, rgba(124,58,237,0.1) 0%, transparent 60%)",
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2 relative z-10">
        <span
          className="text-2xl"
          style={{
            filter: "drop-shadow(0 0 8px rgba(139,92,246,0.8))",
            animation: boss.phase === 2 ? "critShake 1.5s ease-in-out infinite" : undefined,
          }}
        >
          {boss.icon}
        </span>
        <div>
          <div className="text-purple-200 font-black text-xs leading-tight">BOSS ENCOUNTER</div>
          <div className="text-gray-500 text-xs">Dungeon — Phase {boss.phase}</div>
        </div>
        {boss.phase === 2 && (
          <div
            className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "linear-gradient(135deg, #dc2626, #f87171)",
              color: "white",
              boxShadow: "0 0 8px rgba(239,68,68,0.6)",
              animation: "hitFlash 0.8s ease-in-out infinite alternate",
            }}
          >
            PHASE 2
          </div>
        )}
      </div>

      {/* HP bar */}
      <div className="relative z-10">
        <BossHpBar boss={boss} />
      </div>

      {/* Loot fanfare overlay */}
      {lastLoot && <LootFanfare drops={lastLoot} onDismiss={onLootDismiss} />}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function spawnRandomBoss(): BossState {
  const template = DUNGEON_BOSSES[Math.floor(Math.random() * DUNGEON_BOSSES.length)];
  return {
    name: template.name,
    icon: template.icon,
    currentHp: template.maxHp,
    maxHp: template.maxHp,
    phase: 1,
    spawnedAt: Date.now(),
  };
}

export function generateBossLoot(questAmount: number): LootDrop[] {
  return LEGENDARY_LOOT.map((d) =>
    d.type === "token" ? { ...d, amount: questAmount } : { ...d }
  );
}

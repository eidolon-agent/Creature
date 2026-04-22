"use client";

import { useEffect, useRef, useState } from "react";
import type { CombatEvent } from "@/features/game/types";

// ─── Floating damage number ────────────────────────────────────────────────

interface FloatNumber {
  id: string;
  damage: number;
  tokens: number;
  isCrit: boolean;
  targetDied: boolean;
  x: number; // % 10-90
  y: number; // % 10-70
}

interface CombatEffectsProps {
  latestEvent: CombatEvent | null;
  /** Container ref so we can attach shake class */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function CombatEffects({ latestEvent, containerRef }: CombatEffectsProps) {
  const [floats, setFloats] = useState<FloatNumber[]>([]);
  const [hitFlash, setHitFlash] = useState(false);
  const prevEventId = useRef<string | null>(null);

  useEffect(() => {
    if (!latestEvent || latestEvent.id === prevEventId.current) return;
    prevEventId.current = latestEvent.id;

    // Random spawn position within the log area
    const x = 10 + Math.random() * 70;
    const y = 10 + Math.random() * 55;

    const entry: FloatNumber = {
      id: latestEvent.id,
      damage: latestEvent.damage,
      tokens: latestEvent.tokensEarned,
      isCrit: latestEvent.isCrit,
      targetDied: latestEvent.targetDied,
      x,
      y,
    };

    setFloats((prev) => [...prev, entry]);

    // Hit flash
    setHitFlash(true);
    setTimeout(() => setHitFlash(false), 200);

    // Crit screen shake
    if (latestEvent.isCrit && containerRef.current) {
      containerRef.current.classList.add("crit-shake");
      setTimeout(() => {
        containerRef.current?.classList.remove("crit-shake");
      }, 450);
    }

    // Remove float after animation completes (1.4s)
    setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== entry.id));
    }, 1400);
  }, [latestEvent, containerRef]);

  return (
    <>
      {/* Hit flash overlay */}
      {hitFlash && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none z-10"
          style={{
            background: "radial-gradient(ellipse at center, rgba(239,68,68,0.18) 0%, transparent 70%)",
            animation: "hitFlash 0.2s ease-out forwards",
          }}
        />
      )}

      {/* Floating damage numbers */}
      {floats.map((f) => (
        <DamageFloat key={f.id} float={f} />
      ))}
    </>
  );
}

function DamageFloat({ float: f }: { float: FloatNumber }) {
  return (
    <div
      className="absolute pointer-events-none z-20 select-none"
      style={{
        left: `${f.x}%`,
        top: `${f.y}%`,
        animation: "floatUp 1.4s ease-out forwards",
      }}
    >
      {/* Damage number */}
      <div
        className="font-black leading-none drop-shadow-lg"
        style={{
          fontSize: f.isCrit ? "1.35rem" : f.damage > 200 ? "1.1rem" : "0.95rem",
          color: f.isCrit
            ? "#fbbf24"
            : f.targetDied
            ? "#f87171"
            : "#ffffff",
          textShadow: f.isCrit
            ? "0 0 12px rgba(251,191,36,0.9), 0 2px 4px rgba(0,0,0,0.8)"
            : f.targetDied
            ? "0 0 8px rgba(248,113,113,0.7), 0 2px 4px rgba(0,0,0,0.8)"
            : "0 2px 4px rgba(0,0,0,0.9)",
          WebkitTextStroke: f.isCrit ? "0.5px rgba(0,0,0,0.6)" : "none",
        }}
      >
        {f.isCrit && (
          <span className="text-xs mr-0.5 align-middle" style={{ fontSize: "0.6em" }}>
            CRIT!{" "}
          </span>
        )}
        -{f.damage}
      </div>

      {/* Token earned — shown separately, drifts slightly offset */}
      {f.tokens > 0 && (
        <div
          className="font-bold text-xs leading-none mt-0.5"
          style={{
            color: "#34d399",
            textShadow: "0 0 6px rgba(52,211,153,0.8), 0 2px 3px rgba(0,0,0,0.8)",
            animation: "floatUp 1.4s ease-out 0.1s forwards",
            opacity: 0,
          }}
        >
          +{f.tokens.toFixed(1)} QUEST
        </div>
      )}

      {/* KO splash */}
      {f.targetDied && (
        <div
          className="text-xs font-black mt-0.5"
          style={{
            color: "#f87171",
            textShadow: "0 0 8px rgba(248,113,113,0.9)",
            animation: "floatUp 1.4s ease-out 0.05s forwards",
            opacity: 0,
          }}
        >
          ☠ KO
        </div>
      )}
    </div>
  );
}

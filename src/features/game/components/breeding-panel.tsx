"use client";

import { useState, useEffect, useCallback } from "react";
import type { Creature, Rarity, CreatureClass } from "@/features/game/types";

// ─── Constants ─────────────────────────────────────────────────────────────

const BREED_COST = 1000;
const COOLDOWN_SECONDS = 30; // 30s demo (real = 5 days)
const MUTATION_CHANCE = 0.08;

const RARITY_BORDER: Record<Rarity, string> = {
  common:    "border-gray-600",
  rare:      "border-blue-500",
  epic:      "border-purple-500",
  legendary: "border-yellow-400",
};
const RARITY_TEXT: Record<Rarity, string> = {
  common:    "text-gray-300",
  rare:      "text-blue-300",
  epic:      "text-purple-300",
  legendary: "text-yellow-300",
};
const CLASS_COLOR: Record<string, string> = {
  beast: "text-orange-400", plant: "text-emerald-400",
  aqua: "text-cyan-400",   bug: "text-lime-400", reptile: "text-teal-400",
};

// ─── Genetics engine ────────────────────────────────────────────────────────

interface OffspringPreview {
  name: string;
  imageEmoji: string;
  class: CreatureClass;
  rarity: Rarity;
  stats: { hp: number; attack: number; speed: number; defense: number };
  traits: TraitRow[];
  isMutation: boolean;
}

interface TraitRow {
  label: string;
  parentA: string | number;
  parentB: string | number;
  offspring: string | number;
  source: "A" | "B" | "mutation";
  color: string;
}

const RARITY_RANK: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary"];
const CLASSES: CreatureClass[] = ["beast", "plant", "aqua", "bug", "reptile"];
const EMOJI_MAP: Record<string, string> = {
  beast: "🦊", plant: "🌿", aqua: "🐚", bug: "🦋", reptile: "🐍",
};

function blendStat(a: number, b: number, src: "A" | "B" | "mutation"): number {
  if (src === "mutation") return Math.floor(Math.max(a, b) * (1.05 + Math.random() * 0.15));
  const dominant = src === "A" ? a : b;
  const recessive = src === "A" ? b : a;
  return Math.floor(dominant * 0.6 + recessive * 0.4 + (Math.random() - 0.5) * 10);
}

function pickSource(): "A" | "B" | "mutation" {
  const r = Math.random();
  if (r < MUTATION_CHANCE) return "mutation";
  return r < 0.55 ? "A" : "B";
}

function deriveOffspring(a: Creature, b: Creature): OffspringPreview {
  const classSrc = pickSource();
  const offClass: CreatureClass =
    classSrc === "mutation"
      ? CLASSES[Math.floor(Math.random() * CLASSES.length)]
      : classSrc === "A"
      ? a.class
      : b.class;

  // Rarity: weighted toward higher parent, small chance to upgrade
  const higherRank = Math.max(RARITY_RANK[a.rarity], RARITY_RANK[b.rarity]);
  const roll = Math.random();
  let rarityRank = roll < 0.05 ? Math.min(3, higherRank + 1) : roll < 0.65 ? higherRank : Math.max(0, higherRank - 1);
  const offRarity = RARITY_ORDER[rarityRank];
  const isMutation = classSrc === "mutation" || offRarity !== RARITY_ORDER[higherRank];

  const hpSrc   = pickSource();
  const atkSrc  = pickSource();
  const spdSrc  = pickSource();
  const defSrc  = pickSource();

  const traits: TraitRow[] = [
    {
      label: "Class",
      parentA: a.class, parentB: b.class,
      offspring: offClass,
      source: classSrc,
      color: CLASS_COLOR[offClass] ?? "text-white",
    },
    {
      label: "Rarity",
      parentA: a.rarity, parentB: b.rarity,
      offspring: offRarity,
      source: isMutation ? "mutation" : (RARITY_RANK[a.rarity] >= RARITY_RANK[b.rarity] ? "A" : "B"),
      color: RARITY_TEXT[offRarity],
    },
    {
      label: "HP",
      parentA: a.stats.maxHp, parentB: b.stats.maxHp,
      offspring: blendStat(a.stats.maxHp, b.stats.maxHp, hpSrc),
      source: hpSrc, color: "text-emerald-400",
    },
    {
      label: "ATK",
      parentA: a.stats.attack, parentB: b.stats.attack,
      offspring: blendStat(a.stats.attack, b.stats.attack, atkSrc),
      source: atkSrc, color: "text-red-400",
    },
    {
      label: "SPD",
      parentA: a.stats.speed, parentB: b.stats.speed,
      offspring: blendStat(a.stats.speed, b.stats.speed, spdSrc),
      source: spdSrc, color: "text-yellow-400",
    },
    {
      label: "DEF",
      parentA: a.stats.defense, parentB: b.stats.defense,
      offspring: blendStat(a.stats.defense, b.stats.defense, defSrc),
      source: defSrc, color: "text-blue-400",
    },
  ];

  const firstName  = a.name.split(" ")[0];
  const secondName = b.name.split(" ").slice(-1)[0];

  return {
    name: `${firstName}-${secondName}`,
    imageEmoji: EMOJI_MAP[offClass] ?? "🥚",
    class: offClass,
    rarity: offRarity,
    stats: {
      hp:      blendStat(a.stats.maxHp,   b.stats.maxHp,   hpSrc),
      attack:  blendStat(a.stats.attack,  b.stats.attack,  atkSrc),
      speed:   blendStat(a.stats.speed,   b.stats.speed,   spdSrc),
      defense: blendStat(a.stats.defense, b.stats.defense, defSrc),
    },
    traits,
    isMutation,
  };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function CreatureSlot({
  label,
  creature,
  candidates,
  onSelect,
  takenId,
}: {
  label: string;
  creature: Creature | null;
  candidates: Creature[];
  onSelect: (id: string | null) => void;
  takenId: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (!creature) {
    return (
      <div className="flex-1">
        <div className="text-gray-400 text-xs font-semibold mb-1.5 text-center">{label}</div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full h-24 rounded-xl border-2 border-dashed border-gray-600 hover:border-pink-600/70 transition-colors flex flex-col items-center justify-center gap-1 bg-gray-900/50"
        >
          <span className="text-2xl opacity-60">🥚</span>
          <span className="text-gray-500 text-xs">Select creature</span>
        </button>
        {open && (
          <div className="mt-1.5 space-y-1 bg-gray-900/90 border border-gray-700/50 rounded-xl p-2 z-10">
            {candidates
              .filter((c) => c.id !== takenId)
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onSelect(c.id); setOpen(false); }}
                  className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <span className="text-lg">{c.imageEmoji}</span>
                  <div className="min-w-0">
                    <div className="text-white text-xs font-semibold truncate">{c.name}</div>
                    <div className={`text-xs capitalize ${CLASS_COLOR[c.class]}`}>
                      {c.class} · LV{c.level}
                    </div>
                  </div>
                  <span className={`text-xs ml-auto ${RARITY_TEXT[c.rarity]}`}>
                    {c.rarity.slice(0,3).toUpperCase()}
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="text-gray-400 text-xs font-semibold mb-1.5 text-center">{label}</div>
      <div
        className={`relative rounded-xl border-2 ${RARITY_BORDER[creature.rarity]} bg-gray-900/80 p-3 text-center`}
        style={creature.rarity === "legendary" ? { boxShadow: "0 0 12px rgba(251,191,36,0.3)" } : undefined}
      >
        <button
          onClick={() => onSelect(null)}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs flex items-center justify-center leading-none"
        >
          ×
        </button>
        <div className="text-3xl mb-1">{creature.imageEmoji}</div>
        <div className="text-white font-bold text-xs truncate">{creature.name}</div>
        <div className={`text-xs capitalize mt-0.5 ${CLASS_COLOR[creature.class]}`}>
          {creature.class}
        </div>
        <div className={`text-xs mt-0.5 font-semibold ${RARITY_TEXT[creature.rarity]}`}>
          {creature.rarity.toUpperCase()}
        </div>
        <div className="text-gray-500 text-xs mt-1">
          {creature.breedCount}/{creature.maxBreeds} breeds
        </div>
      </div>
    </div>
  );
}

function TraitTable({ traits }: { traits: TraitRow[] }) {
  const sourceLabel = (s: "A" | "B" | "mutation") =>
    s === "mutation" ? "✨ Mut." : s === "A" ? "← A" : "B →";
  const sourceBg = (s: "A" | "B" | "mutation") =>
    s === "mutation"
      ? "bg-yellow-900/60 text-yellow-300 border-yellow-700/50"
      : s === "A"
      ? "bg-cyan-900/50 text-cyan-300 border-cyan-800/40"
      : "bg-purple-900/50 text-purple-300 border-purple-800/40";

  return (
    <div className="rounded-xl overflow-hidden border border-gray-700/50">
      {/* Header */}
      <div className="grid grid-cols-4 bg-gray-800/80 px-3 py-1.5 text-xs text-gray-400 font-semibold">
        <span>Trait</span>
        <span className="text-cyan-400 text-center">Parent A</span>
        <span className="text-purple-400 text-center">Parent B</span>
        <span className="text-center">Offspring</span>
      </div>
      {/* Rows */}
      {traits.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-4 px-3 py-2 text-xs border-t border-gray-800/60 items-center"
        >
          <span className="text-gray-400 font-semibold">{row.label}</span>
          <span className="text-center text-gray-300 capitalize truncate px-1">{row.parentA}</span>
          <span className="text-center text-gray-300 capitalize truncate px-1">{row.parentB}</span>
          <div className="flex flex-col items-center gap-0.5">
            <span className={`capitalize font-bold text-center ${row.color}`}>{row.offspring}</span>
            <span className={`text-[10px] px-1 py-0.5 rounded border ${sourceBg(row.source)}`}>
              {sourceLabel(row.source)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function OffspringCard({ offspring }: { offspring: OffspringPreview }) {
  return (
    <div
      className={`rounded-xl border-2 ${RARITY_BORDER[offspring.rarity]} bg-gray-900/80 p-4`}
      style={{
        animation: "fanfareIn 0.5s ease-out forwards",
        boxShadow: offspring.rarity === "legendary"
          ? "0 0 20px rgba(251,191,36,0.4)"
          : offspring.rarity === "epic"
          ? "0 0 16px rgba(139,92,246,0.35)"
          : undefined,
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center text-4xl border-2 border-gray-700"
          style={{ animation: "floatUp 0.6s ease-out forwards" }}
        >
          {offspring.imageEmoji}
        </div>
        <div>
          <div className="text-white font-black text-base">{offspring.name}</div>
          <div className={`text-xs capitalize font-semibold ${CLASS_COLOR[offspring.class]}`}>
            {offspring.class}
          </div>
          <div className={`text-xs font-bold mt-0.5 ${RARITY_TEXT[offspring.rarity]}`}>
            {offspring.rarity.toUpperCase()}
            {offspring.isMutation && (
              <span className="ml-1.5 text-yellow-300">✨ Mutation!</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { l: "HP",  v: offspring.stats.hp,      c: "text-emerald-400" },
          { l: "ATK", v: offspring.stats.attack,   c: "text-red-400" },
          { l: "SPD", v: offspring.stats.speed,    c: "text-yellow-400" },
          { l: "DEF", v: offspring.stats.defense,  c: "text-blue-400" },
        ].map((s) => (
          <div key={s.l} className="bg-gray-800/60 rounded-lg py-1.5 text-center">
            <div className={`text-xs font-bold ${s.c}`}>{s.v}</div>
            <div className="text-gray-500 text-xs">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CooldownBar({ endsAt, onDone }: { endsAt: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));

  useEffect(() => {
    if (remaining <= 0) { onDone(); return; }
    const t = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) { clearInterval(t); onDone(); }
    }, 500);
    return () => clearInterval(t);
  }, [endsAt, onDone]);

  const pct = Math.max(0, (remaining / COOLDOWN_SECONDS) * 100);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400 font-semibold">⏳ Breeding Cooldown</span>
        <span className="text-pink-300 font-bold font-mono">{label}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-800/80 overflow-hidden border border-gray-700/40">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #db2777, #f472b6)",
            boxShadow: "0 0 8px rgba(219,39,119,0.5)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface BreedingPanelProps {
  creatures: Creature[];
}

type BreedPhase = "select" | "preview" | "cooldown" | "result";

export function BreedingPanel({ creatures }: BreedingPanelProps) {
  const [parentAId, setParentAId] = useState<string | null>(null);
  const [parentBId, setParentBId] = useState<string | null>(null);
  const [phase, setPhase]         = useState<BreedPhase>("select");
  const [preview, setPreview]     = useState<OffspringPreview | null>(null);
  const [cooldownEnd, setCooldownEnd] = useState<number>(0);
  const [offspring, setOffspring] = useState<OffspringPreview | null>(null);
  const [breeding, setBreeding]   = useState(false);

  const parentA = creatures.find((c) => c.id === parentAId) ?? null;
  const parentB = creatures.find((c) => c.id === parentBId) ?? null;
  const canPreview = !!parentA && !!parentB && phase === "select";

  // Recompute preview whenever parents change
  useEffect(() => {
    if (parentA && parentB) {
      setPreview(deriveOffspring(parentA, parentB));
      setPhase("preview");
    } else {
      setPreview(null);
      if (phase === "preview") setPhase("select");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentAId, parentBId]);

  const handleBreed = useCallback(() => {
    if (!parentA || !parentB || breeding) return;
    setBreeding(true);
    // Animate for 1.5s then reveal
    setTimeout(() => {
      const result = deriveOffspring(parentA, parentB);
      setOffspring(result);
      setCooldownEnd(Date.now() + COOLDOWN_SECONDS * 1000);
      setPhase("cooldown");
      setBreeding(false);
    }, 1500);
  }, [parentA, parentB, breeding]);

  const handleReset = useCallback(() => {
    setParentAId(null);
    setParentBId(null);
    setPreview(null);
    setOffspring(null);
    setPhase("select");
  }, []);

  return (
    <div
      className="rounded-xl border border-pink-800/40 bg-gradient-to-br from-pink-950/30 to-purple-950/20 overflow-hidden"
      style={{ boxShadow: "0 0 20px rgba(219,39,119,0.08)" }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-pink-900/30">
        <div className="flex items-center gap-2">
          <span className="text-xl" style={{ filter: "drop-shadow(0 0 6px rgba(219,39,119,0.7))" }}>🧬</span>
          <div>
            <div className="text-pink-200 font-black text-sm">Breeding Chamber</div>
            <div className="text-gray-500 text-xs">Select two creatures to breed offspring</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-yellow-400 font-bold text-sm">{BREED_COST.toLocaleString()}</div>
            <div className="text-gray-500 text-xs">QUEST cost</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Parent selector */}
        <div className="flex items-start gap-3">
          <CreatureSlot
            label="Parent A"
            creature={parentA}
            candidates={creatures}
            onSelect={(id) => { setParentAId(id); if (!id) setPhase("select"); }}
            takenId={parentBId}
          />
          <div className="flex-shrink-0 flex flex-col items-center justify-center pt-8 gap-1">
            <div
              className="text-2xl"
              style={{
                filter: canPreview ? "drop-shadow(0 0 8px rgba(219,39,119,0.8))" : undefined,
                opacity: canPreview ? 1 : 0.4,
              }}
            >
              ×
            </div>
          </div>
          <CreatureSlot
            label="Parent B"
            creature={parentB}
            candidates={creatures}
            onSelect={(id) => { setParentBId(id); if (!id) setPhase("select"); }}
            takenId={parentAId}
          />
        </div>

        {/* Trait probability table */}
        {preview && phase !== "cooldown" && phase !== "result" && (
          <div>
            <div className="text-gray-300 text-xs font-semibold mb-2">Predicted Offspring Traits</div>
            <TraitTable traits={preview.traits} />
          </div>
        )}

        {/* Breed button */}
        {(phase === "select" || phase === "preview") && (
          <button
            disabled={!canPreview || breeding}
            onClick={handleBreed}
            className={`
              w-full py-3 rounded-xl font-black text-sm transition-all duration-200
              ${canPreview && !breeding
                ? "text-white hover:scale-[1.02] active:scale-[0.98]"
                : "opacity-40 cursor-not-allowed text-gray-400 bg-gray-800/60 border border-gray-700/50"
              }
            `}
            style={
              canPreview && !breeding
                ? {
                    background: "linear-gradient(135deg, #be185d, #db2777, #ec4899)",
                    boxShadow: "0 0 20px rgba(219,39,119,0.5)",
                  }
                : undefined
            }
          >
            {breeding ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin text-lg">🧬</span>
                Breeding…
              </span>
            ) : canPreview ? (
              `Breed for ${BREED_COST.toLocaleString()} QUEST`
            ) : (
              "Select both parents to breed"
            )}
          </button>
        )}

        {/* Cooldown + result */}
        {(phase === "cooldown" || phase === "result") && offspring && (
          <div className="space-y-4">
            <div className="text-gray-300 text-xs font-semibold">New Offspring</div>
            <OffspringCard offspring={offspring} />

            {phase === "cooldown" && (
              <CooldownBar
                endsAt={cooldownEnd}
                onDone={() => setPhase("result")}
              />
            )}

            {phase === "result" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-700/40 rounded-xl p-3">
                  <span className="text-xl">✅</span>
                  <div>
                    <div className="text-emerald-300 font-bold text-xs">Cooldown Complete!</div>
                    <div className="text-gray-400 text-xs">Your offspring is ready to deploy as an agent</div>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-2.5 rounded-xl font-bold text-sm text-pink-300 border border-pink-800/50 hover:bg-pink-950/40 transition-colors"
                >
                  Breed Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mutation odds info */}
        <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-900/40 rounded-lg px-3 py-2">
          <span>🎲</span>
          <span>
            Each trait: <span className="text-cyan-400">55% Parent A</span> · <span className="text-purple-400">37% Parent B</span> · <span className="text-yellow-400">8% Mutation</span>
          </span>
        </div>
      </div>
    </div>
  );
}

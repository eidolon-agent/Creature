"use client";

import { useState } from "react";
import { CreatureCard } from "@/features/game/components/creature-card";
import { BreedingPanel } from "@/features/game/components/breeding-panel";
import { MOCK_CREATURES, MOCK_PLAYER_STATS } from "@/features/game/mock-data";

export function CreaturesTab() {
  const [activeSection, setActiveSection] = useState<"roster" | "breed">("roster");
  const creatures = MOCK_CREATURES;

  return (
    <div className="space-y-4">
      {/* Stats banner */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Creatures",    value: MOCK_PLAYER_STATS.totalCreatures, icon: "🐾", color: "text-emerald-400" },
          { label: "Highest LV",   value: MOCK_PLAYER_STATS.highestCreatureLevel, icon: "⭐", color: "text-yellow-400" },
          { label: "Tokens Earned", value: `${(MOCK_PLAYER_STATS.totalTokensEarned / 1000).toFixed(1)}k`, icon: "💰", color: "text-cyan-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-800/60 rounded-xl p-3 text-center border border-gray-700/40">
            <div className="text-xl mb-0.5">{stat.icon}</div>
            <div className={`font-bold text-sm ${stat.color}`}>{stat.value}</div>
            <div className="text-gray-500 text-xs">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Section toggle */}
      <div className="flex gap-2">
        {(["roster", "breed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`
              flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 border
              ${activeSection === s
                ? s === "breed"
                  ? "bg-gradient-to-r from-pink-900/80 to-purple-900/80 border-pink-700/60 text-pink-200"
                  : "bg-gradient-to-r from-emerald-900/80 to-cyan-900/80 border-emerald-700/60 text-emerald-200"
                : "bg-gray-800/50 border-gray-700/40 text-gray-400 hover:text-gray-300"
              }
            `}
          >
            {s === "roster" ? "🐾 My Creatures" : "🧬 Breed"}
          </button>
        ))}
      </div>

      {/* Roster view */}
      {activeSection === "roster" && (
        <div className="space-y-3">
          {creatures.map((creature) => (
            <CreatureCard key={creature.id} creature={creature} />
          ))}
        </div>
      )}

      {/* Breeding view */}
      {activeSection === "breed" && (
        <BreedingPanel creatures={creatures} />
      )}
    </div>
  );
}

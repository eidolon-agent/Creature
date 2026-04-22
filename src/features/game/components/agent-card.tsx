"use client";

import { useState } from "react";
import { Card, CardContent, Button } from "@neynar/ui";
import type { Agent, Creature, AgentStrategy } from "@/features/game/types";
import { ZONES } from "@/features/game/mock-data";

const STATE_CONFIG: Record<string, { label: string; color: string; pulse: boolean }> = {
  idle:      { label: "Idle",      color: "bg-gray-600 text-gray-200",   pulse: false },
  moving:    { label: "Moving",    color: "bg-blue-700 text-blue-100",    pulse: true },
  attacking: { label: "Fighting",  color: "bg-red-700 text-red-100",      pulse: true },
  looting:   { label: "Looting",   color: "bg-yellow-700 text-yellow-100", pulse: true },
  fleeing:   { label: "Fleeing",   color: "bg-orange-700 text-orange-100", pulse: true },
};

const STRATEGY_ICONS: Record<AgentStrategy, string> = {
  farming:   "🌾",
  hunting:   "⚔️",
  exploring: "🗺️",
};

interface AgentCardProps {
  agent: Agent;
  creature: Creature;
  onToggle?: (agentId: string) => void;
  onStrategyChange?: (agentId: string, strategy: AgentStrategy) => void;
}

export function AgentCard({ agent, creature, onToggle, onStrategyChange }: AgentCardProps) {
  const [showConfig, setShowConfig] = useState(false);
  const stateConfig = STATE_CONFIG[agent.state];
  const zone = ZONES.find((z) => z.id === agent.currentZone);

  return (
    <Card className="border border-gray-700 bg-gray-900/80 backdrop-blur-sm">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-900/60 border border-cyan-700/50 flex items-center justify-center text-base">
              🤖
            </div>
            <div>
              <div className="text-white font-bold text-sm">{creature.name}</div>
              <div className="text-gray-400 text-xs">
                {STRATEGY_ICONS[agent.strategy]} {agent.strategy.charAt(0).toUpperCase() + agent.strategy.slice(1)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status pill */}
            <div className={`
              flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold
              ${stateConfig.color}
            `}>
              {stateConfig.pulse && (
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              )}
              {stateConfig.label}
            </div>

            {/* Toggle button */}
            <button
              onClick={() => onToggle?.(agent.id)}
              className={`
                w-11 h-6 rounded-full transition-all duration-300 relative
                ${agent.isActive ? "bg-emerald-500" : "bg-gray-700"}
              `}
            >
              <span className={`
                absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300
                ${agent.isActive ? "left-[22px]" : "left-0.5"}
              `} />
            </button>
          </div>
        </div>

        {/* Zone + Session earnings */}
        <div className="flex items-center justify-between mb-3 bg-gray-800/60 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{zone?.icon ?? "🗺️"}</span>
            <span className="text-gray-300 text-xs">{zone?.name ?? "Unknown Zone"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-400 text-xs font-bold">
              +{agent.tokensThisSession.toFixed(1)} QUEST
            </span>
            <span className="text-gray-500 text-xs">/ session</span>
          </div>
        </div>

        {/* Personality bars */}
        <div className="space-y-2 mb-3">
          {[
            { label: "Aggression", value: agent.personality.aggression, color: "bg-red-500" },
            { label: "Greed",      value: agent.personality.greed,      color: "bg-yellow-500" },
            { label: "Risk Tol.",  value: agent.personality.riskTolerance, color: "bg-purple-500" },
          ].map((trait) => (
            <div key={trait.label}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-400">{trait.label}</span>
                <span className="text-gray-300">{trait.value}%</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${trait.color}`}
                  style={{ width: `${trait.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Memory stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center bg-gray-800/60 rounded-lg py-2">
            <div className="text-emerald-400 text-sm font-bold">
              {agent.memory.totalTokensEarned.toLocaleString('en-US')}
            </div>
            <div className="text-gray-500 text-xs">QUEST earned</div>
          </div>
          <div className="text-center bg-gray-800/60 rounded-lg py-2">
            <div className="text-blue-400 text-sm font-bold">{agent.memory.battlesWon}</div>
            <div className="text-gray-500 text-xs">Battles won</div>
          </div>
          <div className="text-center bg-gray-800/60 rounded-lg py-2">
            <div className="text-purple-400 text-sm font-bold">{agent.memory.sessionsRun}</div>
            <div className="text-gray-500 text-xs">Sessions</div>
          </div>
        </div>

        {/* BehaviorHash */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 text-xs">BehaviorHash:</span>
            <span className="text-cyan-400 text-xs font-mono">{agent.behaviorHash}</span>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {showConfig ? "▲ Config" : "▼ Config"}
          </button>
        </div>

        {/* Strategy selector */}
        {showConfig && (
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <div className="text-gray-400 text-xs mb-2">Strategy</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(["farming", "hunting", "exploring"] as AgentStrategy[]).map((s) => (
                <button
                  key={s}
                  onClick={() => onStrategyChange?.(agent.id, s)}
                  className={`
                    py-2 rounded-lg text-xs font-semibold transition-all
                    ${agent.strategy === s
                      ? "bg-cyan-700 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }
                  `}
                >
                  {STRATEGY_ICONS[s]} {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

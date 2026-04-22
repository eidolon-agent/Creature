"use client";

import { Marketplace } from "@/features/game/components/marketplace";
import { MOCK_MARKET } from "@/features/game/mock-data";

export function MarketTab() {
  return (
    <div className="space-y-4">
      {/* Economy stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/40">
          <div className="text-yellow-400 font-black text-lg">1,284,920</div>
          <div className="text-gray-400 text-xs">QUEST Circulating</div>
          <div className="text-emerald-400 text-xs mt-0.5">+2,340 today</div>
        </div>
        <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/40">
          <div className="text-red-400 font-black text-lg">48,200</div>
          <div className="text-gray-400 text-xs">QUEST Burned</div>
          <div className="text-gray-500 text-xs mt-0.5">via breeding/crafting</div>
        </div>
      </div>

      {/* Token info */}
      <div className="bg-gradient-to-r from-yellow-950/50 to-amber-950/50 border border-yellow-800/30 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <div className="text-2xl">💰</div>
          <div>
            <div className="text-yellow-300 font-semibold text-sm">QuestToken (QUEST)</div>
            <div className="text-gray-400 text-xs mt-0.5">
              ERC-20 on Base • Max supply 1B • Daily emission cap 10k
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-gray-300 text-xs">1,000 QUEST = 1 breed</span>
              <span className="text-gray-500 text-xs">•</span>
              <span className="text-gray-300 text-xs">4% marketplace fee</span>
            </div>
          </div>
        </div>
      </div>

      {/* Market listings */}
      <Marketplace listings={MOCK_MARKET} />
    </div>
  );
}

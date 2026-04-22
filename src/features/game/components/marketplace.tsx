"use client";

import { useState } from "react";
import { Card, CardContent, Button } from "@neynar/ui";
import type { MarketListing } from "@/features/game/types";

const RARITY_STYLE: Record<string, string> = {
  common:    "text-gray-300",
  rare:      "text-blue-300",
  epic:      "text-purple-300",
  legendary: "text-yellow-300",
};

interface MarketplaceProps {
  listings: MarketListing[];
}

export function Marketplace({ listings }: MarketplaceProps) {
  const [filter, setFilter] = useState<"all" | "creature" | "material" | "equipment">("all");
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "new">("new");

  const filtered = listings
    .filter((l) => filter === "all" || l.itemType === filter)
    .sort((a, b) => {
      if (sortBy === "price_asc") return a.priceQuest - b.priceQuest;
      if (sortBy === "price_desc") return b.priceQuest - a.priceQuest;
      return b.listedAt - a.listedAt;
    });

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {(["all", "creature", "material"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${filter === f ? "bg-yellow-700 text-yellow-100" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}
            `}
          >
            {f === "all" ? "All" : f === "creature" ? "🐾 Creatures" : "💎 Materials"}
          </button>
        ))}

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="ml-auto bg-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700"
        >
          <option value="new">Newest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
        </select>
      </div>

      {/* Listings */}
      <div className="space-y-2">
        {filtered.map((listing) => (
          <MarketListingCard key={listing.id} listing={listing} />
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="text-4xl mb-3">🏪</div>
            <div className="text-gray-300 font-semibold text-sm">No listings found</div>
            <div className="text-gray-500 text-xs mt-1">Check back soon!</div>
          </div>
        )}
      </div>
    </div>
  );
}

function MarketListingCard({ listing }: { listing: MarketListing }) {
  const [buying, setBuying] = useState(false);

  function handleBuy() {
    setBuying(true);
    setTimeout(() => setBuying(false), 2000);
  }

  const timeAgo = () => {
    const mins = Math.floor((Date.now() - listing.listedAt) / 60000);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <Card className="border border-gray-700/60 bg-gray-900/80">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Item display */}
          {listing.itemType === "creature" && listing.creature ? (
            <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-600 flex items-center justify-center text-2xl flex-shrink-0">
              {listing.creature.imageEmoji}
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-600 flex items-center justify-center text-2xl flex-shrink-0">
              {listing.itemIcon}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            {listing.itemType === "creature" && listing.creature ? (
              <>
                <div className={`font-bold text-sm ${RARITY_STYLE[listing.creature.rarity]}`}>
                  {listing.creature.name}
                </div>
                <div className="text-gray-400 text-xs">
                  LV {listing.creature.level} • {listing.creature.class} •{" "}
                  <span className="capitalize">{listing.creature.rarity}</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-white font-bold text-sm">{listing.itemName}</div>
                <div className="text-gray-400 text-xs capitalize">{listing.itemType}</div>
              </>
            )}

            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-gray-500 text-xs">by</span>
              <span className="text-cyan-400 text-xs">{listing.sellerName}</span>
              <span className="text-gray-600 text-xs">• {timeAgo()}</span>
            </div>
          </div>

          {/* Price + Buy */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <div className="text-yellow-400 font-bold text-sm">
              {listing.priceQuest.toLocaleString()}
            </div>
            <div className="text-gray-500 text-xs">QUEST</div>
            <button
              onClick={handleBuy}
              disabled={buying}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[32px]
                ${buying
                  ? "bg-gray-700 text-gray-500"
                  : "bg-yellow-600 hover:bg-yellow-500 text-white active:scale-95"
                }
              `}
            >
              {buying ? "Buying..." : "Buy"}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

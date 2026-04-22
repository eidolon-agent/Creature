"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFarcasterUser } from "@/neynar-farcaster-sdk/mini";
import { playerService } from "@/lib/services/player-service";
import { Player } from "@/lib/services/player-service";

export default function GamePage() {
  const router = useRouter();
  const { data: user, isLoading } = useFarcasterUser();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.fid || isLoading) return;

    const loadPlayer = async () => {
      try {
        const existingPlayer = await playerService.getPlayer(user.fid);
        
        if (existingPlayer) {
          setPlayer(existingPlayer);
        } else {
          console.warn("Player not found, redirecting to signup");
          router.push("/signup");
        }
      } catch (err) {
        console.error("Failed to load player:", err);
        router.push("/signup");
      } finally {
        setLoading(false);
      }
    };

    loadPlayer();
  }, [user, isLoading, router]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-purple-500 mx-auto mb-6" />
          <p className="text-2xl text-purple-300">Loading game world...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return null;
  }

  // Class icon mapping
  const classIcons: Record<string, string> = {
    warrior: "⚔️",
    mage: "🔮",
    rogue: "🗡️",
    healer: "✨",
  };

  // Zone name mapping
  const zoneNames: Record<string, string> = {
    crystal_haven: "Crystal Haven",
    whispering_woods: "Whispering Woods",
    shadowfall: "Shadowfall",
    sunscorched_expanse: "Sunscorched Expanse",
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 text-white relative">
      {/* Placeholder Game Canvas */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-8 animate-bounce">🎮</div>
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Welcome, {player.name}!
          </h2>
          <p className="text-2xl text-purple-300 mb-8">
            {classIcons[player.class]} {player.class.toUpperCase()} Level {player.level}
          </p>
          <p className="text-gray-400">
            Currently in: {zoneNames[player.zone] || player.zone}
          </p>
          <div className="mt-8 p-6 bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/30 max-w-md mx-auto">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-gray-400 text-sm">Health</p>
                <p className="text-2xl font-bold text-green-400">{player.hp}/{player.maxHp}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Attack</p>
                <p className="text-2xl font-bold text-red-400">{player.attack}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Experience</p>
                <p className="text-2xl font-bold text-purple-400">{player.experience}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Position</p>
                <p className="text-2xl font-bold text-blue-400">({player.x}, {player.y})</p>
              </div>
            </div>
          </div>
          <p className="mt-8 text-gray-500 text-sm">
            Game engine coming soon... PixiJS integration in progress!
          </p>
        </div>
      </div>

      {/* HUD - Top Bar */}
      <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="text-3xl">{classIcons[player.class] || "🎮"}</div>
            <div>
              <p className="font-bold text-lg">{player.name}</p>
              <p className="text-sm text-purple-300">{player.class.toUpperCase()} • Lvl {player.level}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Health Bar */}
            <div className="flex items-center gap-2">
              <span className="text-green-400">❤️</span>
              <div className="w-32 h-4 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                  style={{ width: `${(player.hp / player.maxHp) * 100}%` }}
                />
              </div>
              <span className="text-sm">{player.hp}/{player.maxHp}</span>
            </div>
            
            {/* XP Bar */}
            <div className="flex items-center gap-2">
              <span className="text-purple-400">⭐</span>
              <div className="w-24 h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-400 transition-all"
                  style={{ width: `${(player.experience % 1000) / 10}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Controls Placeholder */}
      <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
        <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-purple-500/30">
          <h3 className="text-lg font-bold mb-4 text-purple-300">🎯 Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-bold transition-all transform hover:scale-105">
              🗺️ Map
            </button>
            <button className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold transition-all transform hover:scale-105">
              🎒 Inventory
            </button>
            <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold transition-all transform hover:scale-105">
              ⚔️ Combat
            </button>
            <button className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-lg font-bold transition-all transform hover:scale-105">
              💬 Chat
            </button>
          </div>
        </div>

        <div className="bg-black/60 backdrop-blur-md rounded-xl p-6 border border-purple-500/30 text-right">
          <p className="text-sm text-gray-400 mb-2">Controls</p>
          <p className="text-gray-300">🖱️ Click to move</p>
          <p className="text-gray-300">⌨️ WASD to sprint</p>
          <p className="text-gray-300">🎯 Tab to target</p>
        </div>
      </div>

      {/* Mini-map Placeholder */}
      <div className="absolute top-24 right-8 w-48 h-48 bg-black/60 backdrop-blur-md rounded-2xl border-2 border-purple-500/30 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-3xl mb-2">🗺️</p>
          <p className="text-sm">Mini-map</p>
          <p className="text-xs">{zoneNames[player.zone] || player.zone}</p>
        </div>
      </div>
    </div>
  );
}

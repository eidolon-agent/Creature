"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFarcasterUser } from "@/neynar-farcaster-sdk/mini";
import { createClient } from "@/lib/supabase/supabase";

export default function LandingPage() {
  const router = useRouter();
  const { data: user, isLoading } = useFarcasterUser();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  useEffect(() => {
    const checkIfJoined = async () => {
      if (!user?.fid) {
        setChecking(false);
        return;
      }

      const { data } = await supabase
        .from("players")
        .select("id")
        .eq("fid", user.fid)
        .single();

      if (data) {
        setAlreadyJoined(true);
      }
      setChecking(false);
    };

    checkIfJoined();
  }, [user, supabase]);

  if (isLoading || checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-purple-500 mx-auto mb-6" />
          <p className="text-2xl text-purple-300">Loading adventure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 text-white overflow-hidden">
      {/* Animated background stars */}
      <div className="fixed inset-0 -z-10">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full animate-pulse"
            style={{
              width: Math.random() * 3 + 1 + "px",
              height: Math.random() * 3 + 1 + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              animationDelay: Math.random() * 3 + "s",
              animationDuration: Math.random() * 2 + 1 + "s",
            }}
          />
        ))}
      </div>

      {/* Gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-t from-purple-900/30 via-transparent to-blue-900/30 -z-10" />

      <div className="container mx-auto px-4 py-12 min-h-screen flex flex-col items-center justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-8xl font-extrabold mb-6 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent animate-gradient">
              CreatureQuest
            </h1>
            <p className="text-3xl text-purple-200 mb-4">Web3 MMORPG on Farcaster</p>
            <p className="text-xl text-gray-300 mb-8">
              Breed NFT creatures • Battle in real-time • Form guilds • Conquer Shadowfall
            </p>
          </div>

          {/* User Info Card */}
          {user && (
            <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl p-8 mb-12 border border-purple-500/30 shadow-2xl shadow-purple-500/20 max-w-md mx-auto">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-4xl shadow-lg">
                  {user.pfpUrl ? (
                    <img
                      src={user.pfpUrl}
                      alt={user.username || ""}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    "🦸"
                  )}
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-white">
                    {user.username || `Hero #${user.fid}`}
                  </p>
                  <p className="text-purple-300">FID: {user.fid}</p>
                </div>
              </div>

              {alreadyJoined ? (
                <button
                  onClick={() => router.push("/game")}
                  className="w-full py-4 px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xl font-bold rounded-2xl transition-all transform hover:scale-105 shadow-lg"
                >
                  ⚔️ Continue Your Adventure →
                </button>
              ) : (
                <button
                  onClick={() => router.push("/signup")}
                  className="w-full py-4 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xl font-bold rounded-2xl transition-all transform hover:scale-105 shadow-lg shadow-purple-500/50"
                >
                  🎮 Start Your Journey →
                </button>
              )}
            </div>
          )}

          {!user && (
            <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl p-12 mb-12 border border-purple-500/30 shadow-2xl">
              <p className="text-2xl text-gray-300 mb-6">
                Please open this app in a Farcaster client to play
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://warpcast.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all"
                >
                  Open Warpcast
                </a>
                <a
                  href="https://farcaster.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all"
                >
                  Learn About Farcaster
                </a>
              </div>
            </div>
          )}

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left">
            <div className="bg-gray-900/40 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all hover:scale-105">
              <div className="text-5xl mb-4">🎨</div>
              <h3 className="text-xl font-bold text-purple-300 mb-2">NFT Creatures</h3>
              <p className="text-gray-300">
                Breed unique monsters with genetic inheritance and mutations
              </p>
            </div>

            <div className="bg-gray-900/40 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all hover:scale-105">
              <div className="text-5xl mb-4">⚔️</div>
              <h3 className="text-xl font-bold text-purple-300 mb-2">Real-Time Combat</h3>
              <p className="text-gray-300">
                Battle other players and monsters with strategic skill rotations
              </p>
            </div>

            <div className="bg-gray-900/40 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all hover:scale-105">
              <div className="text-5xl mb-4">🏰</div>
              <h3 className="text-xl font-bold text-purple-300 mb-2">Guild System</h3>
              <p className="text-gray-300">
                Join or create guilds, compete in tournaments, conquer territories
              </p>
            </div>
          </div>

          {/* Zones Preview */}
          <div className="mt-16">
            <h2 className="text-4xl font-bold text-center mb-8 text-purple-300">
              Explore Crystal Haven
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["Crystal Haven", "Whispering Woods", "Shadowfall", "Sunscorched Expanse"].map(
                (zone) => (
                  <div
                    key={zone}
                    className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-4 text-center border border-purple-500/20 hover:border-purple-500/40 transition-all"
                  >
                    <p className="text-lg font-bold text-white">{zone}</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-gray-500 text-sm">
          <p>© 2025 CreatureQuest • Built with Next.js + PixiJS + Supabase + Farcaster</p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="/signup" className="text-purple-400 hover:text-purple-300 underline">
              How to Play
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">
              GitHub
            </a>
            <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">
              Discord
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFarcasterUser } from "@/neynar-farcaster-sdk/mini";
import { playerService } from "@/lib/services/player-service";

// ─── Animated Starfield Background ───────────────────────────────────────────
function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const stars: Array<{ 
      x: number; 
      y: number; 
      size: number; 
      speed: number; 
      brightness: number 
    }> = [];
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    const createStars = () => {
      stars.length = 0;
      for (let i = 0; i < 200; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speed: Math.random() * 0.5 + 0.1,
          brightness: Math.random(),
        });
      }
    };
    
    const animate = () => {
      ctx.fillStyle = "rgba(10, 18, 8, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      stars.forEach((star) => {
        star.y -= star.speed;
        star.brightness = Math.sin(Date.now() * 0.001 + star.x) * 0.5 + 0.5;
        
        if (star.y < 0) {
          star.y = canvas.height;
          star.x = Math.random() * canvas.width;
        }
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 220, 255, ${star.brightness})`;
        ctx.fill();
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    resize();
    createStars();
    animate();
    
    window.addEventListener("resize", resize);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10" />;
}

// ─── Class Definitions ──────────────────────────────────────────────────────
const PLAYER_CLASSES = [
  {
    id: "warrior" as const,
    name: "Warrior",
    emoji: "⚔️",
    desc: "High HP, strong melee attacks",
    color: "from-red-600 to-orange-600",
    bgAccent: "bg-red-900/30",
    borderColor: "border-red-500",
    stats: { hp: 220, atk: 45, def: 30, spd: 15 },
    skills: ["Cleave", "Guard", "Berserk"],
  },
  {
    id: "mage" as const,
    name: "Mage",
    emoji: "🔮",
    desc: "Low HP, devastating magic burst",
    color: "from-purple-600 to-blue-600",
    bgAccent: "bg-purple-900/30",
    borderColor: "border-purple-500",
    stats: { hp: 120, atk: 80, def: 15, spd: 25 },
    skills: ["Fireball", "Ice Nova", "Arcane Missiles"],
  },
  {
    id: "rogue" as const,
    name: "Rogue",
    emoji: "🗡️",
    desc: "Fast critical strikes, evasive",
    color: "from-emerald-600 to-teal-600",
    bgAccent: "bg-emerald-900/30",
    borderColor: "border-emerald-500",
    stats: { hp: 160, atk: 55, def: 20, spd: 40 },
    skills: ["Backstab", "Stealth", "Poison"],
  },
  {
    id: "healer" as const,
    name: "Healer",
    emoji: "✨",
    desc: "Self-healing, balanced combat",
    color: "from-yellow-500 to-amber-500",
    bgAccent: "bg-yellow-900/30",
    borderColor: "border-yellow-500",
    stats: { hp: 180, atk: 35, def: 25, spd: 20 },
    skills: ["Heal", "Blessing", "Resurrect"],
  },
];

// ─── Types ─────────────────────────────────────────────────────────────────
type PlayerClass = "warrior" | "mage" | "rogue" | "healer";

interface PlayerData {
  fid: number;
  username: string | null;
  name: string;
  class: PlayerClass;
  walletAddress: string;
  createdAt: string;
}

export default function SignupPage() {
  const router = useRouter();
  const { data: user, isLoading: loadingUser } = useFarcasterUser();
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<PlayerClass | null>(null);
  const [customName, setCustomName] = useState("");
  const [hasSignup, setHasSignup] = useState(false);

  // Check if user already signed up
  useEffect(() => {
    const checkSignup = async () => {
      if (!user?.fid) return;
      
      const existingPlayer = await playerService.getPlayer(user.fid);
      
      if (existingPlayer) {
        setHasSignup(true);
        router.push("/game");
      }
    };
    
    checkSignup();
  }, [user, router]);

  const handleClassSelect = (className: PlayerClass) => {
    setSelectedClass(className);
  };

  const handleSubmit = async () => {
    if (!user || !selectedClass || !customName) return;
    
    setLoading(true);
    try {
      // Create player using service (with fallback to mock)
      const player = await playerService.createPlayer(
        user.fid,
        user.username || `Player_${user.fid}`,
        customName,
        selectedClass
      );
      
      if (!player) throw new Error("Failed to create player");
      
      // Store locally for quick access
      localStorage.setItem("creaturequest_player", JSON.stringify({
        fid: user.fid,
        name: customName,
        class: selectedClass,
      }));
      
      router.push("/game");
    } catch (err) {
      console.error("Signup failed:", err);
      alert("Failed to create hero. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-purple-500 mx-auto mb-6" />
          <p className="text-2xl text-purple-300">Summoning your hero...</p>
        </div>
      </div>
    );
  }

  // No user logged in - redirect to home
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-purple-300 mb-6">Please login with Farcaster</p>
          <button
            onClick={() => router.push("/")}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 text-white overflow-hidden">
      <Starfield />
      
      {/* Animated gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-t from-purple-900/20 via-transparent to-blue-900/20 -z-10 animate-pulse" />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-3xl shadow-lg shadow-purple-500/50">
              {user.pfpUrl ? (
                <img src={user.pfpUrl} alt={user.username || ""} className="w-full h-full rounded-full object-cover" />
              ) : (
                "🦸"
              )}
            </div>
            <div>
              <h1 className="text-6xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
                CreatureQuest
              </h1>
              <p className="text-xl text-purple-200">
                Welcome, {user.username || `Hero #${user.fid}`}!
              </p>
            </div>
          </div>
          <p className="text-lg text-gray-300">
            Choose your class and begin your adventure!
          </p>
        </header>

        {/* Custom Name Input */}
        <div className="max-w-md mx-auto mb-12">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Name your hero..."
            className="w-full px-6 py-4 rounded-2xl bg-gray-800/80 backdrop-blur-xl border-2 border-purple-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:shadow-lg focus:shadow-purple-500/30 transition-all text-xl text-center"
            maxLength={20}
          />
        </div>

        {/* Class Selection */}
        <div className="max-w-7xl mx-auto mb-12">
          <h2 className="text-4xl font-bold text-center mb-8 text-purple-300">
            Select Your Class
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLAYER_CLASSES.map((cls) => (
              <button
                key={cls.id}
                onClick={() => handleClassSelect(cls.id)}
                className={`relative group bg-gray-900/60 backdrop-blur-xl rounded-3xl p-8 border-4 transition-all transform hover:scale-105 hover:shadow-2xl ${
                  selectedClass === cls.id
                    ? `${cls.borderColor} shadow-lg shadow-purple-500/50 scale-105`
                    : "border-transparent hover:border-purple-500/50"
                }`}
              >
                {selectedClass === cls.id && (
                  <div className="absolute -top-4 -right-4 bg-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-lg animate-bounce z-10">
                    ✓
                  </div>
                )}
                
                <div className={`text-7xl mb-4 bg-gradient-to-r ${cls.color} bg-clip-text text-transparent`}>
                  {cls.emoji}
                </div>
                
                <h3 className="text-2xl font-bold mb-2 text-white">{cls.name}</h3>
                <p className="text-gray-300 mb-6 text-sm min-h-[40px]">{cls.desc}</p>
                
                {/* Stats */}
                <div className={`p-4 rounded-xl ${cls.bgAccent} mb-4`}>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(cls.stats).map(([stat, value]) => (
                      <div key={stat} className="flex justify-between">
                        <span className="text-gray-400 uppercase text-xs">{stat}</span>
                        <span className="font-bold text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Skills */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 uppercase">Skills:</p>
                  {cls.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-block px-3 py-1 bg-gray-800/80 rounded-full text-xs text-purple-300 mr-2 mb-2"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        {selectedClass && customName && (
          <div className="text-center">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-16 py-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-3xl font-bold rounded-3xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-purple-500/50 relative overflow-hidden group"
            >
              <span className="relative z-10">
                {loading ? "Summoning Hero..." : "Begin Adventure →"}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-500 text-sm">
          <p>© 2025 CreatureQuest • Web3 MMORPG on Farcaster</p>
          <p className="mt-2">
            Already have an account?{" "}
            <button
              onClick={() => router.push("/game")}
              className="text-purple-400 hover:text-purple-300 underline"
            >
              Continue to Game
            </button>
          </p>
        </footer>
      </div>
    </div>
  );
}

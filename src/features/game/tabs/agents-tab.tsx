"use client";

import { useState, useEffect, useRef } from "react";
import { AgentCard } from "@/features/game/components/agent-card";
import { CombatLog } from "@/features/game/components/combat-log";
import { ZoneMap } from "@/features/game/components/zone-map";
import { DungeonBoss, spawnRandomBoss, generateBossLoot } from "@/features/game/components/dungeon-boss";
import { MOCK_AGENTS, makeMockCombatLog, MOCK_CREATURES, ZONES } from "@/features/game/mock-data";
import type { Agent, AgentStrategy, BossState, CombatEvent, LootDrop } from "@/features/game/types";
import { submitScore, logEvent } from "@/features/game/hooks/use-leaderboard";
import { useFarcasterUser } from "@/neynar-farcaster-sdk/mini";

const CREATURE_NAMES: Record<string, string> = {
  c1: "Thornbark",
  c2: "Crimson Fang",
  c3: "Pearlshell",
};

// ─── Combat event generators ───────────────────────────────────────────────

function generateCombatEvent(agents: Agent[]): CombatEvent | null {
  const activeAgents = agents.filter((a) => a.isActive);
  if (activeAgents.length === 0) return null;

  const agent = activeAgents[Math.floor(Math.random() * activeAgents.length)];
  const enemies: Record<string, string[]> = {
    forest:  ["Forest Slime", "Forest Sprite", "Mushling", "Vine Creeper"],
    cave:    ["Cave Bat", "Stone Golem", "Crystal Crab", "Shadow Sprite"],
    dungeon: ["Void Wraith", "Bone Dragon", "Shadow Demon", "Abyss Stalker"],
    town:    [],
  };
  const zoneEnemies = enemies[agent.currentZone] ?? ["Unknown"];
  if (zoneEnemies.length === 0) return null;

  const skills: Record<string, (string | null)[]> = {
    forest:  ["Leaf Blade", "Vine Wrap", null],
    cave:    ["Savage Bite", "Blood Frenzy", null],
    dungeon: ["Tidal Wave", "Bubble Burst", "Void Strike", "Abyssal Slash"],
    town:    [],
  };
  const zoneSkills = skills[agent.currentZone] ?? [null];

  const inDungeon = agent.currentZone === "dungeon";
  const died = Math.random() > (inDungeon ? 0.28 : 0.35);
  const crit = Math.random() < (inDungeon ? 0.18 : 0.12);
  const baseDamage = inDungeon ? 120 + Math.random() * 320 : 40 + Math.random() * 180;
  const damage = Math.floor(baseDamage) * (crit ? 2 : 1);
  const tokens = died ? parseFloat(((inDungeon ? 8 : 1) + Math.random() * (inDungeon ? 40 : 20)).toFixed(1)) : 0;

  return {
    id: Math.random().toString(36).slice(2),
    timestamp: Date.now(),
    attacker: CREATURE_NAMES[agent.creatureId] ?? "Agent",
    target: zoneEnemies[Math.floor(Math.random() * zoneEnemies.length)],
    damage,
    isCrit: crit,
    skillUsed: zoneSkills[Math.floor(Math.random() * zoneSkills.length)] ?? null,
    targetDied: died,
    tokensEarned: tokens,
    zone: agent.currentZone,
  };
}

function generateBossHit(agents: Agent[], boss: BossState): { event: CombatEvent; damage: number } {
  const dungeonAgents = agents.filter((a) => a.isActive && a.currentZone === "dungeon");
  const attacker = dungeonAgents[0] ? CREATURE_NAMES[dungeonAgents[0].creatureId] ?? "Agent" : "Pearlshell";
  const skills = ["Tidal Wave", "Abyssal Slash", "Void Strike", "Bubble Burst"];
  const crit = Math.random() < 0.25;
  const damage = Math.floor((boss.phase === 2 ? 600 : 380) + Math.random() * 500) * (crit ? 1.8 : 1);

  return {
    damage: Math.floor(damage),
    event: {
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      attacker,
      target: boss.name,
      damage: Math.floor(damage),
      isCrit: crit,
      skillUsed: skills[Math.floor(Math.random() * skills.length)],
      targetDied: false,
      tokensEarned: 0,
      zone: "dungeon",
    },
  };
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AgentsTab() {
  const [agents, setAgents]           = useState<Agent[]>(MOCK_AGENTS);
  const [events, setEvents]           = useState<CombatEvent[]>(() => makeMockCombatLog().slice(0, 5));
  const [totalSession, setTotalSession] = useState(0);

  const { data: user } = useFarcasterUser();
  // Accumulate wins this session; flush to DB every ~30s or on boss kill
  const sessionWinsRef = useRef(0);
  const flushTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Flush accumulated score to DB
  const flushScore = (questDelta: number, winsDelta: number, bossKillsDelta = 0) => {
    if (!user?.fid) return;
    submitScore({
      fid:           user.fid,
      username:      user.username ?? `fid:${user.fid}`,
      displayName:   (user as any).display_name ?? (user as any).displayName ?? user.username ?? "",
      avatarUrl:     (user as any).pfp_url ?? (user as any).pfpUrl ?? "",
      questDelta:    Math.floor(questDelta),
      winsDelta,
      bossKillsDelta,
      level:         1,
    }).catch(() => {/* silently ignore network errors */});
  };

  // Boss state
  const [boss, setBoss]               = useState<BossState | null>(null);
  const [pendingLoot, setPendingLoot] = useState<LootDrop[] | null>(null);
  const bossRef                        = useRef<BossState | null>(null);
  bossRef.current                      = boss;

  const tickRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const bossTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bossSpawnRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasDungeonAgent = agents.some((a) => a.isActive && a.currentZone === "dungeon");

  // ─── Periodic score flush every 30s ─────────────────────────────────────
  useEffect(() => {
    if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    flushTimerRef.current = setInterval(() => {
      if (sessionWinsRef.current > 0) {
        flushScore(0, sessionWinsRef.current);
        sessionWinsRef.current = 0;
      }
    }, 30_000);
    return () => { if (flushTimerRef.current) clearInterval(flushTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.fid]);

  // ─── Regular combat tick (2.5s) ─────────────────────────────────────────
  useEffect(() => {
    const hasActive = agents.some((a) => a.isActive);
    if (tickRef.current) clearInterval(tickRef.current);
    if (!hasActive) return;

    tickRef.current = setInterval(() => {
      const newEvent = generateCombatEvent(agents);
      if (!newEvent) return;

      // Skip regular dungeon enemies if a boss is active (fight boss instead)
      if (newEvent.zone === "dungeon" && bossRef.current) return;

      setEvents((prev) => [newEvent, ...prev].slice(0, 20));
      if (newEvent.targetDied) {
        sessionWinsRef.current += 1;
      }
      if (newEvent.tokensEarned > 0) {
        setTotalSession((prev) => prev + newEvent.tokensEarned);
        setAgents((prev) => {
          const activeCount = prev.filter((a) => a.isActive).length;
          return prev.map((a) =>
            a.isActive
              ? { ...a, tokensThisSession: a.tokensThisSession + newEvent.tokensEarned / Math.max(activeCount, 1) }
              : a
          );
        });
      }
    }, 2500);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents.map((a) => `${a.id}:${a.isActive}:${a.currentZone}`).join(",")]);

  // ─── Boss spawn (every ~15s when dungeon agent active, no boss present) ──
  useEffect(() => {
    if (bossSpawnRef.current) clearTimeout(bossSpawnRef.current);
    if (!hasDungeonAgent || boss) return;

    const delay = 4000 + Math.random() * 11000; // 4–15s first spawn
    bossSpawnRef.current = setTimeout(() => {
      setBoss(spawnRandomBoss());
    }, delay);

    return () => { if (bossSpawnRef.current) clearTimeout(bossSpawnRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDungeonAgent, boss === null]);

  // ─── Boss combat tick (1.2s) ─────────────────────────────────────────────
  useEffect(() => {
    if (bossTickRef.current) clearInterval(bossTickRef.current);
    if (!boss || !hasDungeonAgent) return;

    bossTickRef.current = setInterval(() => {
      setBoss((prev) => {
        if (!prev) return null;

        const { event, damage } = generateBossHit(agents, prev);
        const newHp = Math.max(0, prev.currentHp - damage);
        const phase: 1 | 2 = newHp < prev.maxHp * 0.3 ? 2 : 1;

        // Boss died
        if (newHp <= 0) {
          const questReward = Math.floor(800 + Math.random() * 1200);
          const drops = generateBossLoot(questReward);

          const killEvent: CombatEvent = {
            ...event,
            target: prev.name,
            damage,
            targetDied: true,
            tokensEarned: questReward,
            isBossKill: true,
            lootDrops: drops,
          };

          setEvents((e) => [killEvent, ...e].slice(0, 20));
          setTotalSession((t) => t + questReward);

          // Persist boss kill to leaderboard immediately
          flushScore(questReward, sessionWinsRef.current, 1);
          sessionWinsRef.current = 0;
          if (user?.fid) {
            logEvent({
              fid:       user.fid,
              username:  user.username ?? `fid:${user.fid}`,
              eventType: "boss_kill",
              detail:    `Defeated ${prev.name} and claimed ${questReward} QUEST`,
              questGain: questReward,
            }).catch(() => {});
          }

          setAgents((agts) => {
            const dungeonCount = agts.filter((a) => a.isActive && a.currentZone === "dungeon").length;
            return agts.map((a) =>
              a.isActive && a.currentZone === "dungeon"
                ? { ...a, tokensThisSession: a.tokensThisSession + questReward / Math.max(dungeonCount, 1) }
                : a
            );
          });

          setPendingLoot(drops);
          return null;
        }

        // Ongoing hit — add event to log
        setEvents((e) => [event, ...e].slice(0, 20));

        return { ...prev, currentHp: newHp, phase };
      });
    }, 1200);

    return () => { if (bossTickRef.current) clearInterval(bossTickRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boss?.name, hasDungeonAgent]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  function handleToggle(agentId: string) {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? { ...a, isActive: !a.isActive, state: !a.isActive ? "moving" : "idle" }
          : a
      )
    );
  }

  function handleStrategyChange(agentId: string, strategy: AgentStrategy) {
    setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, strategy } : a)));
  }

  const activeCount = agents.filter((a) => a.isActive).length;

  return (
    <div className="space-y-4">
      {/* Session summary */}
      <div className="bg-gradient-to-r from-cyan-950/60 to-emerald-950/60 border border-cyan-800/30 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-gray-300 text-xs mb-0.5">Session Earnings</div>
            <div className="text-emerald-400 font-black text-xl">
              {totalSession.toFixed(1)} <span className="text-sm font-normal text-gray-400">QUEST</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-gray-300 text-xs mb-0.5">Active Agents</div>
            <div className="text-cyan-400 font-black text-xl">
              {activeCount}
              <span className="text-gray-500 text-sm font-normal">/{agents.length}</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className={`
              w-3 h-3 rounded-full mb-1
              ${activeCount > 0 ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}
            `} />
            <span className="text-xs text-gray-400">{activeCount > 0 ? "Live" : "Paused"}</span>
          </div>
        </div>
      </div>

      {/* Zone map */}
      <div>
        <div className="text-gray-300 text-sm font-semibold mb-2">World Zones</div>
        <ZoneMap zones={ZONES} />
      </div>

      {/* Dungeon boss panel — only shown when dungeon agent is active */}
      {hasDungeonAgent && (
        <div>
          <div className="text-gray-300 text-sm font-semibold mb-2">💀 Dungeon Boss</div>
          <DungeonBoss
            boss={boss}
            lastLoot={pendingLoot}
            onLootDismiss={() => setPendingLoot(null)}
          />
        </div>
      )}

      {/* Agent cards */}
      <div>
        <div className="text-gray-300 text-sm font-semibold mb-2">Your Agents</div>
        <div className="space-y-3">
          {agents.map((agent) => {
            const creature = MOCK_CREATURES.find((c) => c.id === agent.creatureId);
            if (!creature) return null;
            return (
              <AgentCard
                key={agent.id}
                agent={agent}
                creature={creature}
                onToggle={handleToggle}
                onStrategyChange={handleStrategyChange}
              />
            );
          })}
        </div>
      </div>

      {/* Live combat log */}
      <CombatLog events={events} />
    </div>
  );
}

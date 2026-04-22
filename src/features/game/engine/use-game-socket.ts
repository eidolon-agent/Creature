"use client";

/**
 * use-game-socket.ts
 *
 * Simulated WebSocket multiplayer hook.
 *
 * Architecture:
 *   - Connects immediately (simulated latency ~250ms)
 *   - Receives "world state" updates: other players + agents visible on the map
 *   - Receives "combat events" from other players
 *   - Exports sendAction() to broadcast player position / attacks
 *
 * Real integration path:
 *   Replace SOCKET_URL = null → "wss://your-game-server.com/ws"
 *   The hook will use the real WebSocket and fall back to simulation if
 *   connection fails.
 *
 * Sim layer generates 3–5 fake "other players" that wander around,
 * so the game world feels alive even before a real backend exists.
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Change to real server URL when ready ─────────────────────────────────
const SOCKET_URL: string | null = null;
// const SOCKET_URL = "wss://creaturequest.example.com/ws";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface NetPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  map: string;
  hp: number;
  maxHp: number;
  level: number;
  class: "warrior" | "mage" | "rogue" | "berserker" | "archer";
  facing: "left" | "right";
  frame: number;
  aiState?: string; // for agents: what they're doing
}

export interface NetCombatEvent {
  type: "attack" | "kill" | "levelup";
  attackerId: string;
  targetId?: string;
  damage: number;
  isCrit: boolean;
  msg: string;
  timestamp: number;
}

export interface GameSocketState {
  connected: boolean;
  latencyMs: number;
  onlinePlayers: number;
  netPlayers: NetPlayer[];
  netEvents: NetCombatEvent[];
}

export interface GameSocketActions {
  sendPosition: (x: number, y: number, map: string) => void;
  sendAttack: (targetId: string, damage: number, isCrit: boolean) => void;
  sendEmote: (emote: string) => void;
}

// ─── Sim constants ─────────────────────────────────────────────────────────

const SIM_NAMES = ["Zephira", "Drakos", "Lyrien", "Korva", "Ash", "Nyxara", "Baelthorn", "Cael"];
const SIM_CLASSES: NetPlayer["class"][] = ["warrior", "mage", "rogue", "berserker", "archer"];
const SIM_MAPS = ["town", "forest", "dungeon"];
const SIM_AI_STATES = ["farming", "hunting", "looting", "moving", "defending", "at town"];

interface SimPlayer extends NetPlayer {
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  mapWidth: number;
  mapHeight: number;
  attackCd: number;
  walkFrame: number;
  walkTimer: number;
}

function randIn<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createSimPlayer(id: string): SimPlayer {
  const map = randIn(SIM_MAPS);
  const [mw, mh] = map === "town" ? [1200, 1200] : map === "forest" ? [2000, 2000] : [1600, 1600];
  const x = 200 + Math.random() * (mw - 400);
  const y = 200 + Math.random() * (mh - 400);
  const level = 1 + Math.floor(Math.random() * 15);
  return {
    id,
    name: randIn(SIM_NAMES),
    x, y,
    map,
    hp: 80 + level * 20,
    maxHp: 100 + level * 20,
    level,
    class: randIn(SIM_CLASSES),
    facing: "right",
    frame: 0,
    aiState: randIn(SIM_AI_STATES),
    vx: 0, vy: 0,
    targetX: x, targetY: y,
    mapWidth: mw, mapHeight: mh,
    attackCd: 0,
    walkFrame: 0,
    walkTimer: 0,
  };
}

const COMBAT_MSG_TEMPLATES = [
  (a: string, t: string, d: number) => `${a} slashes ${t} for ${d} dmg`,
  (a: string, t: string, d: number) => `${a} crits ${t}! ${d} DAMAGE`,
  (a: string, _t: string, d: number) => `${a} destroys a mob for ${d}`,
  (a: string, t: string, d: number) => `${a} vs ${t}: ${d} dmg dealt`,
];

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useGameSocket(playerMap: string, playerName: string): GameSocketState & GameSocketActions {
  const [state, setState] = useState<GameSocketState>({
    connected: false,
    latencyMs: 0,
    onlinePlayers: 0,
    netPlayers: [],
    netEvents: [],
  });

  const wsRef       = useRef<WebSocket | null>(null);
  const simPlayers  = useRef<SimPlayer[]>([]);
  const tickRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const latencyRef  = useRef<number>(0);
  const simMode     = useRef<boolean>(true);

  // ── Bootstrap ───────────────────────────────────────────────────────────
  useEffect(() => {
    // Simulated connect delay
    const connectTimer = setTimeout(() => {
      if (SOCKET_URL) {
        // Real WebSocket
        try {
          const ws = new WebSocket(SOCKET_URL);
          wsRef.current = ws;
          simMode.current = false;

          ws.onopen = () => {
            setState(prev => ({ ...prev, connected: true }));
          };

          ws.onclose = () => {
            // Fallback to sim
            simMode.current = true;
            startSim();
          };

          ws.onerror = () => {
            simMode.current = true;
            startSim();
          };

          ws.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data);
              if (msg.type === "world_state") {
                setState(prev => ({
                  ...prev,
                  netPlayers: msg.players ?? [],
                  onlinePlayers: msg.online ?? 0,
                }));
              } else if (msg.type === "combat") {
                setState(prev => ({
                  ...prev,
                  netEvents: [msg.event, ...prev.netEvents].slice(0, 10),
                }));
              } else if (msg.type === "pong") {
                latencyRef.current = Date.now() - msg.sentAt;
                setState(prev => ({ ...prev, latencyMs: latencyRef.current }));
              }
            } catch { /* ignore bad frames */ }
          };

          // Ping every 5s
          const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping", sentAt: Date.now() }));
            }
          }, 5000);

          return () => {
            clearInterval(pingInterval);
            ws.close();
          };
        } catch {
          simMode.current = true;
          startSim();
        }
      } else {
        // Simulation mode
        startSim();
      }
    }, 280 + Math.random() * 200);

    return () => {
      clearTimeout(connectTimer);
      if (tickRef.current) clearInterval(tickRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Simulation ───────────────────────────────────────────────────────────
  function startSim() {
    const count = 4 + Math.floor(Math.random() * 4); // 4–7 fake players
    simPlayers.current = Array.from({ length: count }, (_, i) => createSimPlayer(`sim_${i}`));

    setState(prev => ({
      ...prev,
      connected: true,
      onlinePlayers: count + 1,
      latencyMs: 12 + Math.floor(Math.random() * 40),
      netPlayers: simPlayers.current.map(simToNet),
    }));

    // Tick every 120ms for smooth movement
    tickRef.current = setInterval(() => tickSim(), 120);
  }

  function simToNet(p: SimPlayer): NetPlayer {
    return {
      id: p.id, name: p.name, x: p.x, y: p.y, map: p.map,
      hp: p.hp, maxHp: p.maxHp, level: p.level, class: p.class,
      facing: p.facing, frame: p.frame, aiState: p.aiState,
    };
  }

  function tickSim() {
    const DT = 0.12; // seconds
    const newEvents: NetCombatEvent[] = [];

    simPlayers.current = simPlayers.current.map(p => {
      let { x, y, targetX, targetY, vx, vy } = p;

      // Pick new target if close
      const dist = Math.hypot(targetX - x, targetY - y);
      if (dist < 8 || Math.random() < 0.005) {
        targetX = 100 + Math.random() * (p.mapWidth - 200);
        targetY = 100 + Math.random() * (p.mapHeight - 200);
      }

      // Steer toward target
      const dx = targetX - x;
      const dy = targetY - y;
      const d  = Math.hypot(dx, dy) || 1;
      const speed = 60 + p.level * 2;
      vx = (dx / d) * speed;
      vy = (dy / d) * speed;

      x = Math.min(Math.max(x + vx * DT, 20), p.mapWidth  - 20);
      y = Math.min(Math.max(y + vy * DT, 20), p.mapHeight - 20);

      const facing: "left" | "right" = vx < 0 ? "left" : "right";

      // Walk animation frame
      let walkTimer = p.walkTimer + DT;
      let walkFrame = p.walkFrame;
      if (walkTimer > 0.35) { walkTimer = 0; walkFrame = walkFrame === 0 ? 1 : 0; }

      // Random combat event
      let attackCd = p.attackCd - DT;
      if (attackCd <= 0 && Math.random() < 0.04) {
        const dmg = Math.floor(20 + Math.random() * 80 + p.level * 5);
        const isCrit = Math.random() < 0.15;
        const tmpl = randIn(COMBAT_MSG_TEMPLATES);
        newEvents.push({
          type: "attack",
          attackerId: p.id,
          damage: isCrit ? dmg * 2 : dmg,
          isCrit,
          msg: tmpl(p.name, "mob", isCrit ? dmg * 2 : dmg),
          timestamp: Date.now(),
        });
        attackCd = 3 + Math.random() * 5;
      }

      // Rarely switch map
      if (Math.random() < 0.0008) {
        const newMap = randIn(SIM_MAPS);
        const [mw, mh] = newMap === "town" ? [1200, 1200] : newMap === "forest" ? [2000, 2000] : [1600, 1600];
        return { ...p, map: newMap, x: 200, y: 200, mapWidth: mw, mapHeight: mh, facing, vx, vy, targetX, targetY, walkFrame, walkTimer, attackCd };
      }

      return { ...p, x, y, vx, vy, targetX, targetY, facing, walkFrame, walkTimer, attackCd };
    });

    setState(prev => {
      // Only expose players on same map as local player
      const visible = simPlayers.current
        .filter(p => p.map === playerMap)
        .map(simToNet);

      return {
        ...prev,
        netPlayers: visible,
        onlinePlayers: simPlayers.current.length + 1,
        netEvents: newEvents.length > 0
          ? [...newEvents, ...prev.netEvents].slice(0, 10)
          : prev.netEvents,
      };
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const sendPosition = useCallback((x: number, y: number, map: string) => {
    if (!simMode.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "move", x, y, map }));
    }
  }, []);

  const sendAttack = useCallback((targetId: string, damage: number, isCrit: boolean) => {
    if (!simMode.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "attack", targetId, damage, isCrit }));
    }
  }, []);

  const sendEmote = useCallback((emote: string) => {
    if (!simMode.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "emote", emote }));
    }
  }, []);

  return { ...state, sendPosition, sendAttack, sendEmote };
}

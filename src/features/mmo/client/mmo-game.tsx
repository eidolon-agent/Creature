"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  loadPixiJS, buildTilemapGraphics, makeCharacterTexture,
  makeMonsterTexture, makeNpcTexture, drawMinimap, clearTexCache,
  type SpriteClass,
} from "./renderer";
import {
  ZONE_DEFS, MONSTER_DEFS, TILE,
  type AnyEntity, type ZoneId, type ZoneSnapshot,
  type PlayerEntity, type NpcEntity,
} from "../types";
import type { TileGrid } from "@/features/mmo/server/game-world";

// ─── Constants ─────────────────────────────────────────────────────────────
const POLL_MS      = 150;
const CAM_LERP     = 0.14;
const POS_LERP     = 0.30;    // smooth between server snapshots
const HIT_FLASH_MS = 200;

// ─── Types ─────────────────────────────────────────────────────────────────
interface FloatLabel {
  id: number; text: string;
  x: number; y: number;
  color: string; born: number; isCrit: boolean;
}
interface HudState {
  hp: number; maxHp: number;
  xp: number; xpNext: number;
  level: number; gold: number;
  zone: string; kills: number;
}
interface ActivityEntry { id: number; text: string; color: string; at: number; }
interface NpcDialog { entityId: string; name: string; text: string; x: number; y: number; }

// Per-entity display state — rebuilt only when snapshot changes, not every rAF
interface EntityDisplay {
  spr: any;                   // PIXI.Container
  img: any;                   // PIXI.Sprite (texture updated when frame changes)
  hpBg: any; hpFill: any;     // PIXI.Graphics — geometry rebuilt on HP change
  label: any;                 // PIXI.Text
  ring: any | null;           // PIXI.Graphics | null
  aiTag: any | null;          // PIXI.Text | null
  lastHp: number;
  lastFrame: number;
  lastDir: string;
  lastClass: string;
}

const PLAYER_CLASSES: { id: SpriteClass; label: string; emoji: string; desc: string; hp: number; dmg: number }[] = [
  { id: "warrior", label: "Warrior", emoji: "⚔️", desc: "High HP, strong melee", hp: 220, dmg: 45 },
  { id: "mage",    label: "Mage",    emoji: "🔮", desc: "Low HP, burst magic",   hp: 120, dmg: 80 },
  { id: "rogue",   label: "Rogue",   emoji: "🗡️", desc: "Fast crits, evasive",  hp: 160, dmg: 55 },
  { id: "healer",  label: "Healer",  emoji: "✨", desc: "Self-heal, balanced",   hp: 180, dmg: 35 },
];

const NPC_DIALOGS: Record<string, string[]> = {
  warp:   ["Ready to journey?", "I can send you anywhere!", "The world awaits."],
  shop:   ["Fresh supplies!", "Best deals in the realm!", "Buy or sell, traveler."],
  quest:  ["I need brave help.", "Danger lurks nearby…", "Great rewards await!"],
  healer: ["Rest now, warrior.", "I'll mend your wounds.", "Be blessed, hero."],
};

interface MmoGameProps { fid: number; playerName: string; initialZone?: ZoneId; }

// ─── Class selection screen ────────────────────────────────────────────────
export function MmoGame({ fid, playerName, initialZone = "crystal_haven" }: MmoGameProps) {
  const [chosen, setChosen] = useState(false);
  const [cls, setCls] = useState<SpriteClass>("warrior");

  if (!chosen) {
    return (
      <div
        className="h-full w-full flex flex-col items-center justify-center p-4"
        style={{ background: "linear-gradient(180deg,#080c18 0%,#0a1408 100%)" }}
      >
        <div className="text-4xl mb-1 animate-bounce">⚔️</div>
        <div className="font-black text-xl mb-0.5" style={{ color: "#f0d080" }}>Choose Your Class</div>
        <div className="text-xs mb-5" style={{ color: "#5a7a5a" }}>Welcome, {playerName}</div>
        <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
          {PLAYER_CLASSES.map(c => (
            <button
              key={c.id}
              onClick={() => { setCls(c.id); setChosen(true); }}
              className="rounded-xl p-3 text-left active:scale-95 transition-all"
              style={{ background: "rgba(18,12,6,0.9)", border: "2px solid #4a3820" }}
            >
              <div className="text-2xl mb-1">{c.emoji}</div>
              <div className="font-black text-sm" style={{ color: "#f0d080" }}>{c.label}</div>
              <div className="text-[10px] mb-2" style={{ color: "#6a7a5a" }}>{c.desc}</div>
              <div className="flex gap-1.5">
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,60,60,0.2)", color: "#ff8888" }}>
                  HP {c.hp}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(60,60,255,0.2)", color: "#8888ff" }}>
                  ATK {c.dmg}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return <MmoGameCanvas fid={fid} playerName={playerName} playerClass={cls} initialZone={initialZone} />;
}

// ─── Game canvas ───────────────────────────────────────────────────────────
// All heavy PixiJS work lives here.
// Key perf rules:
//   1. rAF loop NEVER creates PixiJS objects — only moves / tints existing ones.
//   2. Display objects are built once per entity and cached in `dispMapRef`.
//   3. HP bar geometry is rebuilt only when HP changes (not every frame).
//   4. Zone change hot-swaps tilemap in-place (no PixiJS App.destroy/create).
function MmoGameCanvas({ fid, playerName, playerClass, initialZone }: {
  fid: number; playerName: string; playerClass: SpriteClass; initialZone: ZoneId;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef       = useRef<any>(null);
  const worldRef     = useRef<any>(null);
  const uiRef        = useRef<any>(null);
  const tilemapRef   = useRef<any>(null);
  const entitiesRef  = useRef<any>(null);
  const minimapRef   = useRef<any>(null);

  // Per-entity cached display state — rebuilt only when content actually changes
  const dispMapRef  = useRef<Map<string, EntityDisplay>>(new Map());
  // Client-side interpolated pixel positions
  const interpMapRef = useRef<Map<string, { px: number; py: number }>>(new Map());
  // Last time entity was hit (for tint flash)
  const hitTimeMapRef = useRef<Map<string, number>>(new Map());

  const floatIdRef = useRef(0);
  const actIdRef   = useRef(0);
  const rafRef     = useRef<number>(0);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const destroyed  = useRef(false);
  const zoneRef    = useRef<ZoneId>(initialZone);
  const aaRef      = useRef(false); // auto-attack

  const [loaded,    setLoaded]    = useState(false);
  const [zone,      setZone]      = useState<ZoneId>(initialZone);
  const [hud,       setHud]       = useState<HudState>({ hp: 220, maxHp: 220, xp: 0, xpNext: 100, level: 1, gold: 0, zone: "Crystal Haven", kills: 0 });
  const [floats,    setFloats]    = useState<FloatLabel[]>([]);
  const [activity,  setActivity]  = useState<ActivityEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [autoAttack, setAutoAttack] = useState(false);
  const [npcDialog,  setNpcDialog]  = useState<NpcDialog | null>(null);

  const camTarget = useRef({ x: 0, y: 0 });
  const camPos    = useRef({ x: 0, y: 0 });
  const playerId  = `player_${fid}`;
  const snapRef   = useRef<ZoneSnapshot | null>(null);
  const canvasW   = useRef(424);
  const canvasH   = useRef(520);

  // ── Zone hot-swap ────────────────────────────────────────────────────
  const changeZone = useCallback(async (newZone: ZoneId) => {
    if (newZone === zoneRef.current) return;
    zoneRef.current = newZone;
    setZone(newZone);
    snapRef.current = null;
    setNpcDialog(null);
    setSelectedId(null);

    // Clear entity display cache
    if (entitiesRef.current) {
      entitiesRef.current.removeChildren();
      dispMapRef.current.clear();
      interpMapRef.current.clear();
      hitTimeMapRef.current.clear();
    }

    // Hot-swap tilemap
    if (tilemapRef.current) {
      tilemapRef.current.removeChildren();
      try {
        const d = await fetch(`/api/mmo/tilemap?zone=${newZone}`).then(r => r.json());
        if (!destroyed.current && tilemapRef.current) {
          const PIXI = (window as any).PIXI;
          tilemapRef.current.addChild(buildTilemapGraphics(d.grid));
        }
      } catch { /* ignore */ }
    }

    // Teleport player to new zone spawn
    fetch("/api/mmo/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, destX: ZONE_DEFS[newZone].spawnX, destY: ZONE_DEFS[newZone].spawnY, zone: newZone }),
    }).catch(() => null);
  }, [playerId]);

  // ── Bootstrap (runs once) ────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    destroyed.current = false;

    (async () => {
      await loadPixiJS();
      await new Promise<void>(r => requestAnimationFrame(() => r()));
      if (destroyed.current || !containerRef.current) return;

      const PIXI = (window as any).PIXI;
      const W = containerRef.current.clientWidth  || 424;
      const H = containerRef.current.clientHeight || 520;
      canvasW.current = W;
      canvasH.current = H;

      const app = new PIXI.Application({
        width: W, height: H,
        backgroundColor: 0x0a1208,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        antialias: false,
        powerPreference: "low-power",
      });
      containerRef.current.appendChild(app.view);
      appRef.current = app;

      // Layers — order matters for draw order
      const worldContainer    = new PIXI.Container();
      const tilemapContainer  = new PIXI.Container();
      const entitiesContainer = new PIXI.Container();
      const uiContainer       = new PIXI.Container();
      const mmContainer       = new PIXI.Container();

      worldContainer.addChild(tilemapContainer, entitiesContainer);
      app.stage.addChild(worldContainer, uiContainer);
      uiContainer.addChild(mmContainer);

      worldRef.current    = worldContainer;
      tilemapRef.current  = tilemapContainer;
      entitiesRef.current = entitiesContainer;
      uiRef.current       = uiContainer;
      minimapRef.current  = mmContainer;

      // Initial data
      const curZone = zoneRef.current;
      await Promise.all([
        fetch(`/api/mmo/state?fid=${fid}&name=${encodeURIComponent(playerName)}&zone=${curZone}`),
        fetch(`/api/mmo/tilemap?zone=${curZone}`)
          .then(r => r.json())
          .then(d => {
            if (!destroyed.current) tilemapContainer.addChild(buildTilemapGraphics(d.grid));
          }),
      ]);

      // Pointer input
      app.view.addEventListener("pointerdown", (e: PointerEvent) => {
        const rect = (app.view as HTMLCanvasElement).getBoundingClientRect();
        const sx = (e.clientX - rect.left) * (W / rect.width);
        const sy = (e.clientY - rect.top)  * (H / rect.height);
        const wx = sx - worldContainer.x;
        const wy = sy - worldContainer.y;
        const tx = Math.floor(wx / TILE);
        const ty = Math.floor(wy / TILE);
        const snap = snapRef.current;
        if (snap) {
          // NPC tap
          const npc = snap.entities.find(en =>
            en.type === "npc" && Math.abs(en.x - tx) <= 1 && Math.abs(en.y - ty) <= 1
          ) as NpcEntity | undefined;
          if (npc) {
            const lines = NPC_DIALOGS[npc.role] ?? ["Hello, traveler."];
            const line = lines[Math.floor(Math.random() * lines.length)];
            const ip = interpMapRef.current.get(npc.id) ?? { px: npc.px, py: npc.py };
            setNpcDialog({ entityId: npc.id, name: npc.name, text: line, x: ip.px + worldContainer.x, y: ip.py + worldContainer.y });
            setTimeout(() => setNpcDialog(d => d?.entityId === npc.id ? null : d), 3200);
            return;
          }
          // Enemy tap → attack
          const tgt = snap.entities.find(en =>
            en.type !== "npc" && en.id !== playerId &&
            Math.abs(en.x - tx) <= 1 && Math.abs(en.y - ty) <= 1
          );
          if (tgt) {
            setSelectedId(tgt.id);
            fetch("/api/mmo/attack", { method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ playerId, targetId: tgt.id }) });
            return;
          }
        }
        setNpcDialog(null);
        fetch("/api/mmo/move", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, destX: tx, destY: ty }) });
      });

      setLoaded(true);

      // ── rAF render loop ─────────────────────────────────────────────
      // NEVER creates PixiJS objects. Only translates, tints, updates textures.
      const loop = () => {
        if (destroyed.current) return;
        const snap = snapRef.current;
        const now  = Date.now();

        // Camera lerp toward player's interpolated position
        if (snap) {
          const me = snap.entities.find(e => e.id === playerId);
          if (me) {
            const ip = interpMapRef.current.get(me.id) ?? { px: me.px, py: me.py };
            camTarget.current.x = -(ip.px - W / 2);
            camTarget.current.y = -(ip.py - H / 2);
          }
        }
        camPos.current.x += (camTarget.current.x - camPos.current.x) * CAM_LERP;
        camPos.current.y += (camTarget.current.y - camPos.current.y) * CAM_LERP;

        const zDef = ZONE_DEFS[zoneRef.current];
        worldContainer.x = Math.min(0, Math.max(W - zDef.width  * TILE, camPos.current.x));
        worldContainer.y = Math.min(0, Math.max(H - zDef.height * TILE, camPos.current.y));

        // Step interpolated positions toward server positions
        if (snap) {
          for (const en of snap.entities) {
            const prev = interpMapRef.current.get(en.id) ?? { px: en.px, py: en.py };
            interpMapRef.current.set(en.id, {
              px: prev.px + (en.px - prev.px) * POS_LERP,
              py: prev.py + (en.py - prev.py) * POS_LERP,
            });
          }
        }

        // Update sprite positions and tints (NO object creation)
        for (const [id, disp] of dispMapRef.current) {
          const ip = interpMapRef.current.get(id);
          if (!ip) continue;
          disp.spr.x = ip.px;
          disp.spr.y = ip.py;

          // Hit flash tint
          const hitAge = now - (hitTimeMapRef.current.get(id) ?? 0);
          const flash = hitAge < HIT_FLASH_MS;
          if (disp.img) disp.img.tint = flash ? 0xff5555 : 0xffffff;

          // Update walk animation frame
          const en = snap?.entities.find(e => e.id === id);
          if (en && disp.img) {
            const newFrame = (Math.floor(now / (en.type === "monster" ? 400 : 250)) % 2) as 0 | 1;
            const newDir = en.dir ?? "down";
            const newClass = getEntityClass(en, playerClass);
            if (newFrame !== disp.lastFrame || newDir !== disp.lastDir || newClass !== disp.lastClass) {
              disp.lastFrame = newFrame;
              disp.lastDir   = newDir;
              disp.lastClass = newClass;
              if (en.type === "monster") {
                disp.img.texture = makeMonsterTexture((en as any).kind, newFrame);
              } else if (en.type === "player" || en.type === "agent") {
                disp.img.texture = makeCharacterTexture(newClass, newDir as any, newFrame);
              }
            }
          }
        }

        // Minimap (only redraws dots, background is static)
        if (minimapRef.current && snap) {
          minimapRef.current.removeChildren();
          drawMinimap(PIXI, minimapRef.current, snap.entities, zDef.width, zDef.height, 0, 0, W - 92, 8);
        }

        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);

      // ── Poll server ──────────────────────────────────────────────────
      pollRef.current = setInterval(async () => {
        if (destroyed.current) return;
        const curZone = zoneRef.current;
        const me = snapRef.current?.entities.find(e => e.id === playerId) as PlayerEntity | undefined;
        const vx = me?.x ?? ZONE_DEFS[curZone].spawnX;
        const vy = me?.y ?? ZONE_DEFS[curZone].spawnY;
        try {
          const res = await fetch(
            `/api/mmo/state?playerId=${playerId}&zone=${curZone}&vx=${vx}&vy=${vy}&fid=${fid}&name=${encodeURIComponent(playerName)}`
          );
          if (!res.ok || destroyed.current) return;
          const snap: ZoneSnapshot = await res.json();
          const prevSnap = snapRef.current;
          snapRef.current = snap;

          // Sync display objects with current entity list (builds/removes as needed)
          syncEntityDisplays(PIXI, snap);

          // Process combat events
          for (const ev of snap.events) {
            hitTimeMapRef.current.set(ev.targetId, Date.now());
            const tgt = snap.entities.find(e => e.id === ev.targetId);
            if (tgt) {
              const ip = interpMapRef.current.get(tgt.id) ?? { px: tgt.px, py: tgt.py };
              addFloat(ev.damage, ev.isCrit, ip.px + worldContainer.x, ip.py + worldContainer.y);
            }
            // Activity log
            const att = snap.entities.find(e => e.id === ev.attackerId);
            const tgtEn = snap.entities.find(e => e.id === ev.targetId);
            if (att && tgtEn) {
              if (ev.attackerId === playerId) {
                const killed = tgtEn.hp <= 0 || tgtEn.isDead;
                addActivity(killed ? `Defeated ${tgtEn.name}!` : `Hit ${tgtEn.name} ${ev.isCrit ? "CRIT " : ""}${ev.damage}`,
                  killed ? "#ffdd00" : ev.isCrit ? "#ff9944" : "#9999ff");
              } else if (ev.targetId === playerId) {
                addActivity(`${att.name} hit you for ${ev.damage}`, "#ff6060");
              }
            }
          }

          // Auto-attack
          if (aaRef.current) {
            const myEnt = snap.entities.find(e => e.id === playerId);
            if (myEnt) {
              const nearest = snap.entities.reduce<{ e: AnyEntity | null; d: number }>(
                (best, en) => {
                  if (en.type !== "monster" || en.isDead) return best;
                  const d = Math.hypot(en.x - myEnt.x, en.y - myEnt.y);
                  return d < best.d ? { e: en, d } : best;
                }, { e: null, d: 9999 }
              );
              if (nearest.e && nearest.d < 8) {
                fetch("/api/mmo/attack", { method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ playerId, targetId: nearest.e.id }) });
              }
            }
          }

          // HUD
          const myEnt = snap.entities.find(e => e.id === playerId) as PlayerEntity | undefined;
          if (myEnt) {
            setHud({ hp: myEnt.hp, maxHp: myEnt.maxHp, xp: myEnt.xp, xpNext: myEnt.xpNext,
              level: myEnt.level, gold: myEnt.gold, zone: ZONE_DEFS[curZone].name, kills: myEnt.kills ?? 0 });
          }
          setOnlineCount(snap.entities.filter(e => e.type === "player" || e.type === "agent").length);
        } catch { /* network hiccup */ }
      }, POLL_MS);
    })();

    return () => {
      destroyed.current = true;
      cancelAnimationFrame(rafRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
      dispMapRef.current.clear();
      interpMapRef.current.clear();
      hitTimeMapRef.current.clear();
      clearTexCache();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fid, playerName]);

  // ── syncEntityDisplays — called once per poll (not per rAF) ──────────
  // Builds display objects for new entities, removes for dead/gone, updates HP bars
  const syncEntityDisplays = useCallback((PIXI: any, snap: ZoneSnapshot) => {
    if (!entitiesRef.current) return;
    const container = entitiesRef.current;
    const existingIds = new Set(snap.entities.map(e => e.id));

    // Remove entities no longer in snapshot
    for (const [id, disp] of dispMapRef.current) {
      if (!existingIds.has(id)) {
        container.removeChild(disp.spr);
        dispMapRef.current.delete(id);
        interpMapRef.current.delete(id);
        hitTimeMapRef.current.delete(id);
      }
    }

    // Create or update each entity
    for (const entity of snap.entities) {
      let disp = dispMapRef.current.get(entity.id);

      if (!disp) {
        // First time we see this entity — build its display tree
        const spr = new PIXI.Container();
        container.addChild(spr);
        interpMapRef.current.set(entity.id, { px: entity.px, py: entity.py }); // snap-in on first appearance

        let img: any = null;
        let ring: any = null;
        let aiTag: any = null;

        if (entity.type === "npc") {
          img = new PIXI.Sprite(makeNpcTexture((entity as any).role ?? "warp"));
          img.anchor.set(0.5, 1);
          spr.addChild(img);
          const lbl = new PIXI.Text(entity.name, { fontSize: 9, fill: 0xffd700, fontWeight: "bold", stroke: 0x000000, strokeThickness: 3 });
          lbl.anchor.set(0.5, 1); lbl.y = 0; spr.addChild(lbl);
          disp = { spr, img, hpBg: null, hpFill: null, label: lbl, ring: null, aiTag: null, lastHp: entity.hp, lastFrame: -1, lastDir: "", lastClass: "" };
        } else if (entity.type === "monster") {
          const mon  = entity as any;
          const size = (MONSTER_DEFS as any)[mon.kind]?.size ?? 1;
          const scl  = mon.kind === "boss_baphomet" ? 2 : size;
          img = new PIXI.Sprite(makeMonsterTexture(mon.kind, 0));
          img.anchor.set(0.5, 1); img.scale.set(scl); spr.addChild(img);
          // HP bar
          const hpBg   = new PIXI.Graphics(); spr.addChild(hpBg);
          const hpFill = new PIXI.Graphics(); spr.addChild(hpFill);
          buildHpBar(PIXI, hpBg, hpFill, entity.hp, entity.maxHp, 0xff4444, -TILE * (size * 0.6 + 0.2));
          const lbl = new PIXI.Text(entity.name, { fontSize: 9, fill: 0xff9090, fontWeight: "bold", stroke: 0x000000, strokeThickness: 3 });
          lbl.anchor.set(0.5, 1); lbl.y = -TILE * (size * 0.6 + 0.6); spr.addChild(lbl);
          if (entity.id === selectedId) { ring = new PIXI.Graphics(); ring.lineStyle(2, 0xff4444, 0.8); ring.drawCircle(0, -6, 16); spr.addChild(ring); }
          disp = { spr, img, hpBg, hpFill, label: lbl, ring, aiTag: null, lastHp: entity.hp, lastFrame: -1, lastDir: "", lastClass: "" };
        } else {
          // player / agent
          const p   = entity as any;
          const cls = getEntityClass(entity, playerClass);
          img = new PIXI.Sprite(makeCharacterTexture(cls, "down", 0));
          img.anchor.set(0.5, 1); spr.addChild(img);
          const hpColor = entity.id === playerId ? 0x44ff88 : 0x4499ff;
          const hpBg   = new PIXI.Graphics(); spr.addChild(hpBg);
          const hpFill = new PIXI.Graphics(); spr.addChild(hpFill);
          buildHpBar(PIXI, hpBg, hpFill, entity.hp, entity.maxHp, hpColor, -38);
          const lbl = new PIXI.Text(entity.name, { fontSize: 9, fill: entity.id === playerId ? 0x88ffaa : entity.type === "agent" ? 0xaabbff : 0xffffff, fontWeight: "bold", stroke: 0x000000, strokeThickness: 3 });
          lbl.anchor.set(0.5, 1); lbl.y = -48; spr.addChild(lbl);
          if (entity.id === playerId) { ring = new PIXI.Graphics(); ring.lineStyle(2, 0x44ff88, 0.8); ring.drawCircle(0, -6, 16); spr.addChild(ring); }
          if (entity.type === "agent" && p.aiState) {
            aiTag = new PIXI.Text("~", { fontSize: 8, fill: 0xffff88, stroke: 0x000000, strokeThickness: 2 });
            aiTag.anchor.set(0.5, 1); aiTag.y = -58; spr.addChild(aiTag);
          }
          disp = { spr, img, hpBg, hpFill, label: lbl, ring, aiTag, lastHp: entity.hp, lastFrame: -1, lastDir: "", lastClass: "" };
        }

        spr.alpha = entity.isDead ? 0.25 : 1;
        dispMapRef.current.set(entity.id, disp);
      } else {
        // Existing entity — only update what changed
        disp.spr.alpha = entity.isDead ? 0.25 : 1;

        // HP bar — only rebuild geometry when HP changes
        if (disp.hpBg && disp.hpFill && disp.lastHp !== entity.hp) {
          disp.lastHp = entity.hp;
          const mon  = entity as any;
          const size = (MONSTER_DEFS as any)[mon.kind]?.size ?? 1;
          const yOff = entity.type === "monster" ? -TILE * (size * 0.6 + 0.2) : -38;
          const color = entity.type === "monster" ? 0xff4444 : entity.id === playerId ? 0x44ff88 : 0x4499ff;
          buildHpBar(PIXI, disp.hpBg, disp.hpFill, entity.hp, entity.maxHp, color, yOff);
        }

        // AI tag text
        if (disp.aiTag && (entity as any).aiState) {
          const AI_ICONS: Record<string, string> = { wander: "~", farm: "*", chase: "!", attack: "X", flee: "<", idle: "z" };
          disp.aiTag.text = AI_ICONS[(entity as any).aiState] ?? "?";
        }
      }
    }

    // Y-depth sort (once per poll, not per rAF)
    container.children.sort((a: any, b: any) => a.y - b.y);
  }, [playerId, selectedId, playerClass]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  function getEntityClass(entity: AnyEntity, myClass: SpriteClass): SpriteClass {
    if (entity.type === "player") return myClass;
    if (entity.type === "agent") {
      const m: Record<string, SpriteClass> = { warrior: "agent_w", mage: "agent_m", rogue: "agent_r", healer: "agent_h" };
      return m[(entity as any).personality] ?? "agent_w";
    }
    return "warrior";
  }

  function buildHpBar(PIXI: any, bg: any, fill: any, hp: number, maxHp: number, color: number, yOff: number) {
    const BW = 28; const BH = 4;
    const pct = Math.max(0, Math.min(1, hp / maxHp));
    bg.clear(); bg.beginFill(0x1a1a1a, 0.85); bg.drawRoundedRect(-BW / 2, yOff, BW, BH, 2); bg.endFill();
    fill.clear(); if (pct > 0) { fill.beginFill(color, 0.9); fill.drawRoundedRect(-BW / 2, yOff, BW * pct, BH, 2); fill.endFill(); }
  }

  function addFloat(damage: number, isCrit: boolean, sx: number, sy: number) {
    setFloats(prev => [...prev.slice(-20), {
      id: floatIdRef.current++, text: isCrit ? `${damage}!!` : `${damage}`,
      x: sx, y: sy, color: isCrit ? "#ffdd00" : "#ffffff", born: Date.now(), isCrit,
    }]);
  }

  function addActivity(text: string, color: string) {
    setActivity(prev => [...prev.slice(-9), { id: actIdRef.current++, text, color, at: Date.now() }]);
  }

  useEffect(() => {
    if (floats.length === 0) return;
    const t = setTimeout(() => setFloats(f => f.filter(fl => Date.now() - fl.born < 1200)), 250);
    return () => clearTimeout(t);
  }, [floats]);

  useEffect(() => {
    if (activity.length === 0) return;
    const t = setTimeout(() => setActivity(a => a.filter(e => Date.now() - e.at < 5000)), 600);
    return () => clearTimeout(t);
  }, [activity]);

  useEffect(() => { aaRef.current = autoAttack; }, [autoAttack]);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#080d06" }}>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading */}
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: "#080c18" }}>
          <div className="text-5xl mb-4 animate-bounce">⚔️</div>
          <div className="font-black text-xl mb-1" style={{ color: "#c8a87a" }}>Entering World…</div>
          <div className="text-sm mb-3" style={{ color: "#5a7a5a" }}>Loading {ZONE_DEFS[zone]?.name || zone}</div>
          <div className="w-44 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full animate-pulse" style={{ width: "70%", background: "linear-gradient(90deg,#5a3810,#c8a060)" }} />
          </div>
        </div>
      )}

      {/* Damage floats */}
      {floats.map(f => {
        const age     = Date.now() - f.born;
        const opacity = Math.max(0, 1 - age / 1100);
        const ty      = -(age / 1100) * 48;
        return (
          <div key={f.id} className="absolute pointer-events-none font-black select-none"
            style={{ left: f.x, top: f.y, transform: `translate(-50%,${ty}px)`, opacity, color: f.color,
              fontSize: f.isCrit ? 20 : 14, zIndex: 15,
              textShadow: f.isCrit ? `0 0 10px ${f.color},2px 2px 0 #000` : `2px 2px 0 #000,-1px -1px 0 #000` }}>
            {f.text}
          </div>
        );
      })}

      {loaded && <>
        {/* ── Player HUD ─────────────────────────────────────────────── */}
        <div className="absolute top-2 left-2 z-10 rounded-xl p-2.5 min-w-[162px]"
          style={{ background: "linear-gradient(135deg,rgba(14,8,2,0.95),rgba(24,14,4,0.92))", border: "2px solid #7a5820",
            boxShadow: "inset 0 1px 0 rgba(255,210,100,0.1),0 4px 20px rgba(0,0,0,0.65)" }}>
          <div className="font-black text-xs mb-2 flex items-center gap-1.5" style={{ color: "#f0d080" }}>
            <span className="text-sm">⚔️</span>
            <span className="truncate flex-1">{playerName}</span>
            <span className="text-[10px] font-bold px-1.5 rounded" style={{ background: "rgba(200,160,40,0.2)", color: "#c8a040" }}>
              Lv{hud.level}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] w-5 font-bold" style={{ color: "#ff7070" }}>HP</span>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(70,10,10,0.7)", border: "1px solid #400808" }}>
              <div className="h-full rounded-full transition-all duration-300" style={{
                width: `${(hud.hp / hud.maxHp) * 100}%`,
                background: hud.hp / hud.maxHp > 0.5 ? "linear-gradient(90deg,#148030,#3af870)"
                  : hud.hp / hud.maxHp > 0.25 ? "linear-gradient(90deg,#886000,#ffc000)"
                  : "linear-gradient(90deg,#881400,#ff3838)",
              }} />
            </div>
            <span className="text-[10px] tabular-nums w-14 text-right" style={{ color: "#cc8888" }}>{hud.hp}/{hud.maxHp}</span>
          </div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] w-5 font-bold" style={{ color: "#6888ff" }}>XP</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(10,10,60,0.7)", border: "1px solid #101038" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${(hud.xp / hud.xpNext) * 100}%`,
                background: "linear-gradient(90deg,#183080,#4466ff)",
              }} />
            </div>
            <span className="text-[10px] tabular-nums w-14 text-right" style={{ color: "#6878cc" }}>{hud.xp}/{hud.xpNext}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tabular-nums" style={{ color: "#f0c040" }}>💰 {hud.gold}</span>
            <span className="text-xs tabular-nums" style={{ color: "#b07848" }}>⚔️ {hud.kills}</span>
          </div>
        </div>

        {/* ── Zone badge ─────────────────────────────────────────────── */}
        <div className="absolute z-10" style={{ top: 8, right: 100 }}>
          <div className="text-[11px] font-black px-2.5 py-1 rounded-lg text-center"
            style={{ background: "rgba(6,4,2,0.92)", border: "1px solid #503808", color: "#c0a038" }}>
            🏰 {hud.zone}
          </div>
          {onlineCount > 0 && (
            <div className="text-[9px] px-2 py-0.5 rounded mt-1 text-center"
              style={{ background: "rgba(6,4,2,0.75)", color: "#486840" }}>
              {onlineCount} online
            </div>
          )}
        </div>

        {/* ── Activity log ───────────────────────────────────────────── */}
        {activity.length > 0 && (
          <div className="absolute z-10 left-2 flex flex-col-reverse gap-0.5" style={{ bottom: 82, maxWidth: 175 }}>
            {activity.slice(-5).map(a => {
              const age = Date.now() - a.at;
              const opacity = Math.max(0, 1 - age / 4800);
              return (
                <div key={a.id} className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ background: "rgba(0,0,0,0.7)", color: a.color, opacity, border: "1px solid rgba(255,255,255,0.05)" }}>
                  {a.text}
                </div>
              );
            })}
          </div>
        )}

        {/* ── NPC dialog ─────────────────────────────────────────────── */}
        {npcDialog && (
          <div className="absolute z-20 pointer-events-none" style={{ left: npcDialog.x - 70, top: npcDialog.y - 88, width: 140 }}>
            <div className="rounded-xl px-3 py-2 text-xs font-bold text-center"
              style={{ background: "rgba(8,6,2,0.96)", border: "2px solid #8a6820", color: "#f0d898",
                boxShadow: "0 4px 12px rgba(0,0,0,0.75)" }}>
              <div className="text-[9px] mb-0.5" style={{ color: "#c8a040" }}>{npcDialog.name}</div>
              <div>"{npcDialog.text}"</div>
            </div>
          </div>
        )}

        {/* ── Selected target ────────────────────────────────────────── */}
        {selectedId && snapRef.current && (() => {
          const t = snapRef.current!.entities.find(e => e.id === selectedId);
          if (!t || t.type === "npc") return null;
          return (
            <div className="absolute bottom-20 left-2 z-10 rounded-xl px-3 py-2"
              style={{ background: "rgba(8,4,2,0.94)", border: "2px solid #601818", minWidth: 140, boxShadow: "0 4px 16px rgba(0,0,0,0.7)" }}>
              <div className="text-xs font-black mb-1" style={{ color: "#ff9090" }}>{t.name}</div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px]" style={{ color: "#cc4040" }}>HP</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(50,6,6,0.7)" }}>
                  <div className="h-full rounded-full transition-all duration-200"
                    style={{ width: `${(t.hp / t.maxHp) * 100}%`, background: "linear-gradient(90deg,#801400,#ff3838)" }} />
                </div>
                <span className="text-[10px] tabular-nums" style={{ color: "#cc6060" }}>{t.hp}/{t.maxHp}</span>
              </div>
              <button className="w-full text-[10px] py-1 rounded-lg active:scale-95"
                style={{ background: "rgba(70,12,12,0.5)", color: "#ff8080", border: "1px solid #501010" }}
                onClick={() => setSelectedId(null)}>
                Deselect
              </button>
            </div>
          );
        })()}

        {/* ── Bottom bar ─────────────────────────────────────────────── */}
        <div className="absolute bottom-3 left-0 right-0 z-10 flex items-end justify-between px-3 gap-2">
          <div className="flex flex-col gap-1">
            <div className="text-[8px] text-center" style={{ color: "#3a5030" }}>WARP TO</div>
            <div className="flex gap-1">
              {(Object.keys(ZONE_DEFS) as ZoneId[]).map(zid => (
                <button key={zid} onClick={() => changeZone(zid)}
                  className="text-[9px] font-bold px-1.5 py-1 rounded-lg active:scale-90 transition-all"
                  style={{
                    background: zid === zone ? "rgba(150,100,20,0.7)" : "rgba(6,4,2,0.85)",
                    border: `1px solid ${zid === zone ? "#a87820" : "#302010"}`,
                    color: zid === zone ? "#f0d070" : "#5a4020",
                  }}>
                  {ZONE_DEFS[zid].name.split(" ")[0].slice(0, 5)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1.5 p-1.5 rounded-xl items-center"
            style={{ background: "rgba(6,4,2,0.94)", border: "2px solid #503810", boxShadow: "inset 0 1px 0 rgba(255,200,80,0.06)" }}>
            <button onClick={() => setAutoAttack(a => !a)}
              className="w-10 h-10 rounded-lg flex flex-col items-center justify-center active:scale-90 transition-all"
              style={{ background: autoAttack ? "rgba(240,50,30,0.22)" : "rgba(20,12,4,0.85)", border: `1px solid ${autoAttack ? "#f03018" : "#503810"}` }}>
              <span className="text-base leading-none">{autoAttack ? "🔴" : "⚔️"}</span>
              <span className="text-[7px] mt-0.5" style={{ color: autoAttack ? "#ff7050" : "#503810" }}>AUTO</span>
            </button>
            {["🛡️","🧪","💨","⭐"].map((icon, i) => (
              <button key={i} className="w-10 h-10 rounded-lg flex items-center justify-center text-lg active:scale-90 transition-all"
                style={{ background: "rgba(20,12,4,0.85)", border: "1px solid #503810" }}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute pointer-events-none text-[9px]"
          style={{ bottom: 64, left: "50%", transform: "translateX(-50%)", color: "#1e2e1e", whiteSpace: "nowrap" }}>
          Tap to move · Tap enemy to attack
        </div>
      </>}
    </div>
  );
}

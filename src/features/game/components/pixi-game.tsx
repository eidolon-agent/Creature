"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  GameEngine,
  MAPS,
  type MapId,
  type Entity,
  type LootDrop,
  type Portal,
} from "@/features/game/engine/game-engine";
import {
  makeCharacterTexture,
  entityToSprite,
  type SpriteType,
} from "@/features/game/engine/sprite-renderer";
import { useGameSocket } from "@/features/game/engine/use-game-socket";

// ─── PixiJS global ────────────────────────────────────────────────────────
declare global {
  interface Window { PIXI: any; }
}

// ─── Constants ───────────────────────────────────────────────────────────
const TILE_SIZE  = 48;
const SPRITE_SIZE = 44; // canvas pixels per sprite

// Zoom configuration
const MIN_ZOOM = 0.5;   // Far view - see more of the map
const MAX_ZOOM = 2.0;   // Close view - see details
const ZOOM_STEP = 0.1;  // How much each scroll/key press changes zoom
const ZOOM_SMOOTH = 0.15; // Interpolation factor for smooth zoom transitions

const MAP_BG: Record<MapId, number> = {
  town:    0x0f2318,
  forest:  0x0a1f0e,
  dungeon: 0x1a0030,
};
const MAP_GRID: Record<MapId, number[]> = {
  town:    [0x34d399, 0.06],
  forest:  [0x4ade80, 0.05],
  dungeon: [0xa78bfa, 0.07],
};
const MAP_BORDER: Record<MapId, number> = {
  town:    0x0f766e,
  forest:  0x166534,
  dungeon: 0x7c3aed,
};

// ─── AI state bubble colors ───────────────────────────────────────────────
const AI_STATE_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  IDLE:         { bg: "rgba(55,65,81,0.85)",     text: "#9ca3af", icon: "💤" },
  MOVE_TO_NPC:  { bg: "rgba(59,130,246,0.85)",   text: "#bfdbfe", icon: "🗣️" },
  MOVE_TO_ZONE: { bg: "rgba(16,185,129,0.85)",   text: "#a7f3d0", icon: "🗺️" },
  HUNT:         { bg: "rgba(239,68,68,0.85)",    text: "#fecaca", icon: "⚔️" },
  RECALL:       { bg: "rgba(245,158,11,0.85)",   text: "#fde68a", icon: "🏃" },
  LOOT:         { bg: "rgba(168,85,247,0.85)",   text: "#e9d5ff", icon: "💰" },
  ATTACK:       { bg: "rgba(220,38,38,0.85)",    text: "#fca5a5", icon: "🗡️" },
  farming:      { bg: "rgba(16,185,129,0.85)",   text: "#a7f3d0", icon: "🌾" },
  hunting:      { bg: "rgba(239,68,68,0.85)",    text: "#fecaca", icon: "⚔️" },
  looting:      { bg: "rgba(168,85,247,0.85)",   text: "#e9d5ff", icon: "💰" },
  moving:       { bg: "rgba(59,130,246,0.85)",   text: "#bfdbfe", icon: "🚶" },
  defending:    { bg: "rgba(245,158,11,0.85)",   text: "#fde68a", icon: "🛡️" },
  "at town":    { bg: "rgba(55,65,81,0.85)",     text: "#9ca3af", icon: "🏘️" },
};

// ─── HUD state ────────────────────────────────────────────────────────────
interface HudState {
  hp: number; maxHp: number;
  xp: number; xpNext: number;
  gold: number; level: number; potions: number;
  mapLabel: string; isPvp: boolean; isPvpCooldown: boolean;
  questText: string; log: string[];
}

// ─── Damage float type ────────────────────────────────────────────────────
interface DmgFloat {
  id: number; text: string; x: number; y: number;
  color: string; born: number; isCrit: boolean;
}

// ─── Load PixiJS from CDN ─────────────────────────────────────────────────
function loadPixi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PIXI) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.3.2/pixi.min.js";
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ─── Main component ───────────────────────────────────────────────────────
interface PixiGameProps {
  playerName: string;
}

export function PixiGame({ playerName }: PixiGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef    = useRef<GameEngine | null>(null);
  const pixiRef      = useRef<any>(null);   // PIXI module
  const appRef       = useRef<any>(null);
  const layerRef     = useRef<{ world: any; ui: any } | null>(null);
  const lastTickRef  = useRef<number>(performance.now());
  const rafRef       = useRef<number>(0);
  const floatIdRef   = useRef<number>(0);
  
  // Zoom state
  const zoomRef      = useRef<number>(1.0);  // Current zoom level
  const targetZoomRef = useRef<number>(1.0); // Target for smooth interpolation

  // Sprite cache: spriteKey → texture
  const spriteCache  = useRef<Map<string, any>>(new Map());
  // Entity sprite-type assignment (stable per entity id)
  const entitySpriteMap = useRef<Map<string, SpriteType>>(new Map());
  // Walk frame state per entity
  const walkFrames   = useRef<Map<string, { frame: number; timer: number }>>(new Map());

  const [hud, setHud] = useState<HudState>({
    hp: 100, maxHp: 100, xp: 0, xpNext: 100, gold: 0,
    level: 1, potions: 3, mapLabel: "🏘️ TOWN",
    isPvp: false, isPvpCooldown: false,
    questText: "Talk to Guild Master", log: [],
  });

  const [loaded,    setLoaded]    = useState(false);
  const [activeMap, setActiveMap] = useState<MapId>("town");
  const [dmgFloats, setDmgFloats] = useState<DmgFloat[]>([]);
  const [canvasSize, setCanvasSize] = useState({ w: 424, h: 520 });

  // ── WebSocket / multiplayer ──────────────────────────────────────────
  const socket = useGameSocket(activeMap, playerName);

  // ── Stable sprite texture getter ───────────────────────────────────────
  const getSpriteTex = useCallback((
    spriteType: SpriteType,
    frame: number = 0,
    facing: "left" | "right" = "right",
  ) => {
    if (!pixiRef.current) return null;
    const key = `${spriteType}_${SPRITE_SIZE}_${facing}_${frame}`;
    if (!spriteCache.current.has(key)) {
      const tex = makeCharacterTexture(pixiRef.current, spriteType, SPRITE_SIZE, { facing, frame });
      spriteCache.current.set(key, tex);
    }
    return spriteCache.current.get(key);
  }, []);

  // ── Get (or assign) stable sprite type for entity ──────────────────────
  const getEntitySpriteType = useCallback((entity: Entity): SpriteType => {
    if (!entitySpriteMap.current.has(entity.id)) {
      const st = entityToSprite(entity.type, (entity as any).subtype, (entity as any).personality);
      entitySpriteMap.current.set(entity.id, st);
    }
    return entitySpriteMap.current.get(entity.id)!;
  }, []);

  // ── Walk frame updater ─────────────────────────────────────────────────
  const tickWalkFrame = useCallback((entityId: string, isMoving: boolean, dt: number) => {
    if (!walkFrames.current.has(entityId)) {
      walkFrames.current.set(entityId, { frame: 0, timer: 0 });
    }
    const wf = walkFrames.current.get(entityId)!;
    if (!isMoving) { wf.frame = 0; wf.timer = 0; return 0; }
    wf.timer += dt / 1000;
    if (wf.timer > 0.3) { wf.timer = 0; wf.frame = wf.frame === 0 ? 1 : 0; }
    return wf.frame;
  }, []);

  // ── Spawn damage float ─────────────────────────────────────────────────
  const spawnFloat = useCallback((
    worldX: number, worldY: number, text: string,
    color: string, isCrit: boolean,
    worldLayer: any, W: number, H: number,
    mapId: MapId, map: { width: number; height: number },
  ) => {
    const cameraX = clamp(W / 2 - worldX, W - map.width, 0);
    const cameraY = clamp(H / 2 - worldY, H - map.height, 0);
    const sx = worldX + cameraX;
    const sy = worldY + cameraY - 20;

    setDmgFloats(prev => [
      ...prev.slice(-12),
      {
        id: floatIdRef.current++,
        text, x: sx, y: sy, color, born: Date.now(), isCrit,
      },
    ]);
  }, []);

  // ── PixiJS init ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    (async () => {
      await loadPixi();
      if (destroyed || !containerRef.current) return;

      // Wait one rAF so flex layout has fully painted before reading dimensions
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (destroyed || !containerRef.current) return;

      const PIXI = window.PIXI;
      pixiRef.current = PIXI;

      const W = containerRef.current.clientWidth  || 424;
      const H = containerRef.current.clientHeight || 520;
      setCanvasSize({ w: W, h: H });

      const app = new PIXI.Application({
        width: W, height: H,
        backgroundColor: 0x0a1020,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: false,
        powerPreference: "low-power",
      });
      containerRef.current.appendChild(app.view);
      appRef.current = app;

      const worldLayer = new PIXI.Container();
      const uiLayer    = new PIXI.Container();
      app.stage.addChild(worldLayer, uiLayer);
      layerRef.current = { world: worldLayer, ui: uiLayer };

      const engine = new GameEngine();
      engine.init(playerName);
      engineRef.current = engine;

      // Tap to move (accounting for zoom)
      app.view.addEventListener("pointerdown", (e: PointerEvent) => {
        if (!engine.player) return;
        const rect = (app.view as HTMLCanvasElement).getBoundingClientRect();
        const sx = (e.clientX - rect.left) * (W / rect.width);
        const sy = (e.clientY - rect.top)  * (H / rect.height);
        const mapId = engine.player.map;
        const map   = MAPS[mapId];
        
        // Get current zoom level (from zoomRef which is set during render)
        // Default to 1.0 if not yet initialized
        const currentZoom = zoomRef.current || 1.0;
        
        // Calculate camera offset with zoom applied
        const cx = clamp(W / 2 - engine.player.x * currentZoom, W - map.width * currentZoom, 0) / currentZoom;
        const cy = clamp(H / 2 - engine.player.y * currentZoom, H - map.height * currentZoom, 0) / currentZoom;
        
        // Convert screen click to world coordinates with zoom
        const worldX = (sx - W / 2 + engine.player.x * currentZoom) / currentZoom;
        const worldY = (sy - H / 2 + engine.player.y * currentZoom) / currentZoom;
        
        engine.movePlayerTo(worldX, worldY);
      });

      setLoaded(true);

      // Game loop
      const loop = (now: number) => {
        if (destroyed) return;
        const dt = now - lastTickRef.current;
        lastTickRef.current = now;

        engine.tick(dt);
        renderFrame(PIXI, app, engine, worldLayer, uiLayer, W, H, dt);
        updateHud(engine, W, H);

        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    })();

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafRef.current);
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
      spriteCache.current.clear();
      entitySpriteMap.current.clear();
      walkFrames.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName]);

  // ── Zoom controls (keyboard + mouse wheel) ─────────────────────────────
  useEffect(() => {
    if (!appRef.current || !containerRef.current) return;

    const app = appRef.current;
    const container = containerRef.current;
    let zoomKeys: { [key: string]: boolean } = {};
    let lastKeyTime = 0;

    // Keyboard handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=" || e.key === "ArrowUp") {
        e.preventDefault();
        targetZoomRef.current = Math.min(MAX_ZOOM, targetZoomRef.current + ZOOM_STEP);
        zoomKeys["+"] = true;
      } else if (e.key === "-" || e.key === "ArrowDown") {
        e.preventDefault();
        targetZoomRef.current = Math.max(MIN_ZOOM, targetZoomRef.current - ZOOM_STEP);
        zoomKeys["-"] = true;
      } else if (e.key === "0" || e.key === "Enter") {
        e.preventDefault();
        targetZoomRef.current = 1.0; // Reset to default zoom
      }
      lastKeyTime = Date.now();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=" || e.key === "ArrowUp") {
        zoomKeys["+"] = false;
      } else if (e.key === "-" || e.key === "ArrowDown") {
        zoomKeys["-"] = false;
      }
    };

    // Mouse wheel handler
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      targetZoomRef.current = clamp(targetZoomRef.current + delta, MIN_ZOOM, MAX_ZOOM);
    };

    // Auto-repeat for sustained key press
    const keyInterval = setInterval(() => {
      if (Date.now() - lastKeyTime < 200) return; // Don't auto-repeat immediately
      if (zoomKeys["+"]) {
        targetZoomRef.current = Math.min(MAX_ZOOM, targetZoomRef.current + ZOOM_STEP * 0.5);
      }
      if (zoomKeys["-"]) {
        targetZoomRef.current = Math.max(MIN_ZOOM, targetZoomRef.current - ZOOM_STEP * 0.5);
      }
    }, 100);

    // Attach listeners - use window to capture keys even when clicking on canvas
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      clearInterval(keyInterval);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // ── Expire damage floats ───────────────────────────────────────────────
  useEffect(() => {
    if (dmgFloats.length === 0) return;
    const t = setTimeout(() => {
      const now = Date.now();
      setDmgFloats(prev => prev.filter(f => now - f.born < 1400));
    }, 200);
    return () => clearTimeout(t);
  }, [dmgFloats]);

  // ── Render frame ──────────────────────────────────────────────────────
  const renderFrame = useCallback((
    PIXI: any, app: any, engine: GameEngine,
    worldLayer: any, uiLayer: any,
    W: number, H: number, dt: number,
  ) => {
    if (!engine.player) return;
    const mapId = engine.player.map;
    const map   = MAPS[mapId];

    worldLayer.removeChildren();
    uiLayer.removeChildren();

    // ── Background ────────────────────────────────────────────────────
    const bg = new PIXI.Graphics();
    bg.beginFill(MAP_BG[mapId]);
    bg.drawRect(0, 0, map.width, map.height);
    bg.endFill();
    worldLayer.addChild(bg);

    // ── Grid ──────────────────────────────────────────────────────────
    const [gridColor, gridAlpha] = MAP_GRID[mapId];
    const grid = new PIXI.Graphics();
    grid.lineStyle(1, gridColor, gridAlpha as number);
    for (let x = 0; x < map.width;  x += TILE_SIZE) { grid.moveTo(x, 0); grid.lineTo(x, map.height); }
    for (let y = 0; y < map.height; y += TILE_SIZE) { grid.moveTo(0, y); grid.lineTo(map.width, y); }
    worldLayer.addChild(grid);

    // ── Map border ────────────────────────────────────────────────────
    const border = new PIXI.Graphics();
    border.lineStyle(4, MAP_BORDER[mapId], 0.7);
    border.drawRect(2, 2, map.width - 4, map.height - 4);
    worldLayer.addChild(border);

    // ── Portals ───────────────────────────────────────────────────────
    for (const portal of engine.getPortalsForMap(mapId)) {
      drawPortal(PIXI, worldLayer, portal);
    }

    // ── Loot drops ────────────────────────────────────────────────────
    for (const loot of engine.getLootOnMap(mapId)) {
      drawLoot(PIXI, worldLayer, loot);
    }

    // ── Net players (other clients — behind local entities) ───────────
    for (const np of socket.netPlayers) {
      if (np.map !== mapId) continue;
      const spriteType = np.class;
      const frame   = np.frame ?? 0;
      const facing  = np.facing ?? "right";
      drawNetPlayer(PIXI, worldLayer, np, spriteType, frame, facing);
    }

    // ── Local entities ────────────────────────────────────────────────
    for (const entity of engine.getEntitiesOnMap(mapId)) {
      const isMoving = Math.hypot((entity as any).vx ?? 0, (entity as any).vy ?? 0) > 5;
      const frame    = tickWalkFrame(entity.id, isMoving, dt);
      const facing: "left" | "right" = ((entity as any).vx ?? 0) < 0 ? "left" : "right";
      const st       = getEntitySpriteType(entity);
      const tex      = getSpriteTex(st, frame, facing);
      drawEntity(PIXI, worldLayer, entity, engine.player, tex, st, frame, facing);
    }

    // ── Camera ────────────────────────────────────────────────────────
    const px = engine.player.x;
    const py = engine.player.y;
    
    // Smooth zoom interpolation
    zoomRef.current += (targetZoomRef.current - zoomRef.current) * ZOOM_SMOOTH;
    
    // Apply zoom to the world layer
    worldLayer.scale.set(zoomRef.current);
    
    // Calculate zoom-adjusted camera position
    const zoomW = W * zoomRef.current;
    const zoomH = H * zoomRef.current;
    worldLayer.x = clamp(W / 2 - px * zoomRef.current, W - map.width * zoomRef.current, 0) / zoomRef.current;
    worldLayer.y = clamp(H / 2 - py * zoomRef.current, H - map.height * zoomRef.current, 0) / zoomRef.current;
    
    // Store zoom for HUD display (optional)
    const zoomDisplay = zoomRef.current.toFixed(2);

    // ── UI layer ──────────────────────────────────────────────────────
    drawMinimap(PIXI, uiLayer, engine, mapId, W, H, socket.netPlayers);

    if (map.pvp) {
      const pvpBorder = new PIXI.Graphics();
      pvpBorder.lineStyle(5, 0xdc2626, 0.45);
      pvpBorder.drawRect(3, 3, W - 6, H - 6);
      uiLayer.addChild(pvpBorder);
    }

    // Connection badge
    if (socket.connected) {
      const badge = new PIXI.Text(
        `${socket.onlinePlayers} online · ${socket.latencyMs}ms`,
        { fontSize: 8, fill: 0x6ee7b7, fontWeight: "bold", stroke: 0x000000, strokeThickness: 2 }
      );
      badge.x = 8; badge.y = H - 14;
      uiLayer.addChild(badge);
    }
    
    // Zoom indicator
    const zoomBadge = new PIXI.Text(
      `${(zoomRef.current * 100).toFixed(0)}%`,
      { fontSize: 8, fill: 0xfbbf24, fontWeight: "bold", stroke: 0x000000, strokeThickness: 2 }
    );
    zoomBadge.x = 8; zoomBadge.y = H - 24;
    uiLayer.addChild(zoomBadge);
    
    // Zoom controls hint in bottom-right corner
    const controlsText = new PIXI.Text(
      "\n\n\n🔍 +/- or scroll to zoom\n(0 to reset)",
      { 
        fontSize: 7, 
        fill: 0x9ca3af, 
        fontStyle: "italic",
        stroke: 0x000000, 
        strokeThickness: 2 
      }
    );
    controlsText.x = W - 95; controlsText.y = H - 75;
    controlsText.align = "right";
    uiLayer.addChild(controlsText);
    
    // Zoom controls hint (only show briefly when zoom changes significantly)
    if (Math.abs(zoomRef.current - targetZoomRef.current) > 0.05) {
      // Smooth transition in progress - optionally show hint
      // (kept minimal to avoid cluttering the UI)
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSpriteTex, getEntitySpriteType, tickWalkFrame, socket.netPlayers, socket.connected, socket.onlinePlayers, socket.latencyMs]);

  // ── Draw helpers ──────────────────────────────────────────────────────

  function drawPortal(PIXI: any, layer: any, portal: Portal) {
    const g = new PIXI.Graphics();
    g.beginFill(portal.color, 0.2);
    g.lineStyle(2, portal.color, 0.75);
    g.drawCircle(portal.x, portal.y, 26);
    g.endFill();
    layer.addChild(g);

    // Spinning ring (fake via rotation on time)
    const ring = new PIXI.Graphics();
    ring.lineStyle(2, portal.color, 0.5);
    const t = (performance.now() % 3000) / 3000;
    ring.arc(portal.x, portal.y, 20, t * Math.PI * 2, t * Math.PI * 2 + Math.PI * 1.4);
    layer.addChild(ring);

    const label = new PIXI.Text(portal.label, {
      fontSize: 10, fill: 0xffffff, fontWeight: "bold",
      stroke: 0x000000, strokeThickness: 3,
    });
    label.anchor.set(0.5, 0);
    label.x = portal.x; label.y = portal.y + 30;
    layer.addChild(label);
  }

  function drawLoot(PIXI: any, layer: any, loot: LootDrop) {
    // Glowing circle under loot
    const glow = new PIXI.Graphics();
    glow.beginFill(0xfbbf24, 0.2);
    glow.drawCircle(loot.x, loot.y, 14);
    glow.endFill();
    layer.addChild(glow);

    // Crystal / coin sprite drawn via PixiJS Graphics (no emoji needed)
    const gem = new PIXI.Graphics();
    gem.beginFill(0xfbbf24, 0.9);
    gem.drawPolygon([loot.x, loot.y - 10, loot.x + 7, loot.y, loot.x, loot.y + 8, loot.x - 7, loot.y]);
    gem.endFill();
    gem.lineStyle(1, 0xfffde7, 0.8);
    gem.drawPolygon([loot.x, loot.y - 10, loot.x + 7, loot.y, loot.x, loot.y + 8, loot.x - 7, loot.y]);
    layer.addChild(gem);

    const label = new PIXI.Text(`+${loot.amount}g`, {
      fontSize: 9, fill: 0xfbbf24, fontWeight: "bold",
      stroke: 0x000000, strokeThickness: 2,
    });
    label.anchor.set(0.5, 1);
    label.x = loot.x; label.y = loot.y - 14;
    layer.addChild(label);
  }

  function drawEntity(
    PIXI: any, layer: any, entity: Entity,
    player: Entity | null, tex: any,
    spriteType: SpriteType, frame: number, facing: "left" | "right",
  ) {
    const EX = entity.x;
    const EY = entity.y;

    // Shadow
    const shadow = new PIXI.Graphics();
    shadow.beginFill(0x000000, 0.2);
    shadow.drawEllipse(EX, EY + SPRITE_SIZE / 2 - 4, 14, 5);
    shadow.endFill();
    layer.addChild(shadow);

    // Sprite
    if (tex) {
      const s = new PIXI.Sprite(tex);
      s.anchor.set(0.5, 0.9); // anchor near feet
      s.x = EX;
      s.y = EY;
      layer.addChild(s);
    }

    // Player selection ring
    if (entity.id === player?.id) {
      const ring = new PIXI.Graphics();
      ring.lineStyle(2, 0x34d399, 0.9);
      ring.drawCircle(EX, EY + 8, 18);
      layer.addChild(ring);
    }

    // Aggressive agent PvP ring in dungeon
    if (entity.type === "agent" && (entity as any).personality === "aggressive" && MAPS[entity.map].pvp) {
      const ring = new PIXI.Graphics();
      ring.lineStyle(2, 0xef4444, 0.55);
      ring.drawCircle(EX, EY + 8, 18);
      layer.addChild(ring);
    }

    // HP bar
    const barW  = 36;
    const barH  = 4;
    const barXl = EX - barW / 2;
    const barYl = EY - SPRITE_SIZE / 2 - 4;
    const hpPct = Math.max(0, entity.hp / entity.maxHp);
    const barBg = new PIXI.Graphics();
    barBg.beginFill(0x1f2937, 0.9);
    barBg.drawRoundedRect(barXl, barYl, barW, barH, 2);
    barBg.endFill();
    layer.addChild(barBg);

    const barColor = hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xf59e0b : 0xef4444;
    const barFill  = new PIXI.Graphics();
    barFill.beginFill(barColor, 0.9);
    barFill.drawRoundedRect(barXl, barYl, barW * hpPct, barH, 2);
    barFill.endFill();
    layer.addChild(barFill);

    // Name label
    const isPlayer = entity.id === player?.id;
    const nameColor =
      isPlayer             ? 0x34d399 :
      entity.type === "agent"  ? 0x93c5fd :
      entity.type === "enemy"  ? 0xf87171 :
                               0xfde68a;

    const nameText = new PIXI.Text(entity.name, {
      fontSize: 9, fill: nameColor, fontWeight: "bold",
      stroke: 0x000000, strokeThickness: 3,
    });
    nameText.anchor.set(0.5, 1);
    nameText.x = EX;
    nameText.y = barYl - 1;
    layer.addChild(nameText);

    // AI state speech bubble (agents only)
    if (entity.type === "agent") {
      const aiState = (entity as any).aiState as string | undefined;
      if (aiState && aiState !== "IDLE") {
        drawAiBubble(PIXI, layer, EX, barYl - 14, aiState);
      }
    }

    // Level badge for enemies
    if (entity.type === "enemy") {
      const lvl = (entity as any).level ?? 1;
      const lvlBadge = new PIXI.Text(`Lv${lvl}`, {
        fontSize: 8, fill: 0xfca5a5, fontWeight: "bold",
        stroke: 0x000000, strokeThickness: 2,
      });
      lvlBadge.anchor.set(0.5, 0);
      lvlBadge.x = EX;
      lvlBadge.y = EY + SPRITE_SIZE / 2 - 4;
      layer.addChild(lvlBadge);
    }
  }

  function drawNetPlayer(
    PIXI: any, layer: any, np: { x: number; y: number; name: string; hp: number; maxHp: number; level: number; aiState?: string },
    spriteType: string, frame: number, facing: "left" | "right",
  ) {
    // Ghost-tinted net player
    const tex = getSpriteTex(spriteType as SpriteType, frame, facing);
    if (tex) {
      const s = new PIXI.Sprite(tex);
      s.anchor.set(0.5, 0.9);
      s.x = np.x; s.y = np.y;
      s.alpha = 0.75;
      layer.addChild(s);
    }

    const nameText = new PIXI.Text(np.name, {
      fontSize: 9, fill: 0xc4b5fd, fontWeight: "bold",
      stroke: 0x000000, strokeThickness: 3,
    });
    nameText.anchor.set(0.5, 1);
    nameText.x = np.x; nameText.y = np.y - SPRITE_SIZE / 2 - 5;
    layer.addChild(nameText);

    // HP bar
    const barW  = 32;
    const barXl = np.x - barW / 2;
    const barYl = np.y - SPRITE_SIZE / 2 - 1;
    const hpPct = Math.max(0, np.hp / np.maxHp);
    const bg2 = new PIXI.Graphics();
    bg2.beginFill(0x1f2937, 0.8);
    bg2.drawRoundedRect(barXl, barYl, barW, 3, 1);
    bg2.endFill();
    layer.addChild(bg2);
    const fill2 = new PIXI.Graphics();
    fill2.beginFill(0x818cf8, 0.9);
    fill2.drawRoundedRect(barXl, barYl, barW * hpPct, 3, 1);
    fill2.endFill();
    layer.addChild(fill2);

    if (np.aiState && np.aiState !== "idle") {
      drawAiBubble(PIXI, layer, np.x, barYl - 12, np.aiState);
    }
  }

  function drawAiBubble(PIXI: any, layer: any, x: number, y: number, state: string) {
    const style = AI_STATE_STYLE[state] ?? AI_STATE_STYLE.IDLE;
    const label = `${style.icon} ${state}`;
    const txt = new PIXI.Text(label, {
      fontSize: 8, fill: 0xffffff,
      fontWeight: "bold", stroke: 0x000000, strokeThickness: 2,
    });
    txt.anchor.set(0.5, 1);
    txt.x = x; txt.y = y;
    layer.addChild(txt);
  }

  function drawMinimap(
    PIXI: any, layer: any, engine: GameEngine,
    mapId: MapId, W: number, H: number,
    netPlayers: Array<{ x: number; y: number; map: string }>,
  ) {
    const MM = 80;
    const MX = W - MM - 8;
    const MY = 8;
    const map = MAPS[mapId];
    const sx = MM / map.width;
    const sy = MM / map.height;

    // Background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x070d1a, 0.88);
    bg.lineStyle(1, 0x374151, 0.8);
    bg.drawRoundedRect(MX, MY, MM, MM, 6);
    bg.endFill();
    layer.addChild(bg);

    // Map name
    const label = new PIXI.Text(MAPS[mapId].label, {
      fontSize: 7, fill: 0x6b7280, fontWeight: "bold",
    });
    label.anchor.set(0.5, 0);
    label.x = MX + MM / 2; label.y = MY + 2;
    layer.addChild(label);

    // Portals
    for (const portal of engine.getPortalsForMap(mapId)) {
      const d = new PIXI.Graphics();
      d.beginFill(portal.color, 0.85);
      d.drawCircle(MX + portal.x * sx, MY + portal.y * sy, 2.5);
      d.endFill();
      layer.addChild(d);
    }

    // Local entities
    for (const entity of engine.getEntitiesOnMap(mapId)) {
      const color = entity.type === "player" ? 0x34d399
        : entity.type === "agent"  ? 0x60a5fa
        : entity.type === "enemy"  ? 0xf87171
        : 0xfde68a;
      const r = entity.type === "player" ? 3 : 1.5;
      const d = new PIXI.Graphics();
      d.beginFill(color, 0.9);
      d.drawCircle(MX + entity.x * sx, MY + entity.y * sy, r);
      d.endFill();
      layer.addChild(d);
    }

    // Net players (purple dots)
    for (const np of netPlayers) {
      if (np.map !== mapId) continue;
      const d = new PIXI.Graphics();
      d.beginFill(0xa78bfa, 0.8);
      d.drawCircle(MX + np.x * sx, MY + np.y * sy, 1.5);
      d.endFill();
      layer.addChild(d);
    }
  }

  // ── Update HUD ────────────────────────────────────────────────────────
  const updateHud = useCallback((engine: GameEngine, W: number, H: number) => {
    const p = engine.player;
    if (!p) return;

    const mapDef = MAPS[p.map];
    const quest  = p.quest;
    let questText = "Talk to Guild Master";
    if (quest && !quest.completed) questText = `Kill enemies: ${quest.progress}/${quest.required}`;
    else if (quest?.completed) questText = "Return to Guild Master!";

    const newLogs = engine.events
      .filter(e => ["kill","levelup","loot","pvp_warning","quest_complete"].includes(e.type))
      .map(e => e.msg);

    // Spawn floats for recent damage events
    if (layerRef.current && appRef.current) {
      for (const ev of engine.events.filter(e => e.type === "kill" || e.type === "pvp_warning")) {
        const map = MAPS[p.map];
        const color  = ev.type === "pvp_warning" ? "#f87171" : "#fbbf24";
        const isCrit = ev.msg?.includes("CRIT") ?? false;
        spawnFloat(
          p.x + (Math.random() - 0.5) * 60,
          p.y - 20,
          isCrit ? "💥 CRIT!" : ev.type === "kill" ? "⚔️ Kill!" : "⚠️ PvP",
          color, isCrit,
          layerRef.current.world, W, H, p.map as MapId, map,
        );
      }
    }

    setActiveMap(p.map as MapId);
    setHud(prev => ({
      hp: p.hp, maxHp: p.maxHp,
      xp: p.xp, xpNext: p.level * 100,
      gold: p.gold, level: p.level,
      potions: p.potions,
      mapLabel: mapDef.label,
      isPvp: mapDef.pvp,
      isPvpCooldown: p.pvpCooldownMs > 0,
      questText,
      log: newLogs.length > 0
        ? [...newLogs, ...prev.log].slice(0, 6)
        : prev.log,
    }));
  }, [spawnFloat]);

  const handlePotion = useCallback(() => {
    engineRef.current?.usePotion();
  }, []);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-950">
      {/* PixiJS canvas */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading screen */}
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-gray-950">
          <div className="text-5xl mb-4 animate-bounce">🐉</div>
          <div className="text-emerald-400 font-black text-xl mb-1">Loading World…</div>
          <div className="text-gray-500 text-sm">Connecting to server…</div>
          <div className="mt-4 w-32 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {/* Damage floats */}
      {loaded && dmgFloats.map(f => {
        const age = Date.now() - f.born;
        const opacity = Math.max(0, 1 - age / 1200);
        const translateY = -(age / 1200) * 50;
        return (
          <div
            key={f.id}
            className="absolute pointer-events-none font-black select-none"
            style={{
              left: f.x,
              top:  f.y,
              transform: `translate(-50%, ${translateY}px)`,
              opacity,
              color: f.color,
              fontSize: f.isCrit ? 18 : 13,
              textShadow: f.isCrit
                ? `0 0 10px ${f.color}, 0 0 20px ${f.color}`
                : `0 1px 3px rgba(0,0,0,0.9)`,
              transition: "none",
              zIndex: 15,
            }}
          >
            {f.text}
          </div>
        );
      })}

      {/* HUD overlay */}
      {loaded && (
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-2">

          {/* Top row */}
          <div className="flex justify-between items-start gap-2">

            {/* Player stat panel */}
            <div
              className="rounded-xl p-2.5 min-w-[152px]"
              style={{
                background: "rgba(7,13,26,0.82)",
                border: "1px solid rgba(55,65,81,0.6)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div className="text-cyan-300 font-black text-xs mb-2 truncate">🧝 {playerName}</div>

              {/* HP */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] text-red-400 w-3">❤️</span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(127,29,29,0.4)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${(hud.hp / hud.maxHp) * 100}%`,
                      background: hud.hp / hud.maxHp > 0.5 ? "#22c55e" : hud.hp / hud.maxHp > 0.25 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>
                <span className="text-gray-300 text-[10px] w-10 text-right tabular-nums">{hud.hp}/{hud.maxHp}</span>
              </div>

              {/* XP */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] text-blue-400 w-3">✨</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(30,58,138,0.4)" }}>
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all duration-300"
                    style={{ width: `${(hud.xp / hud.xpNext) * 100}%` }}
                  />
                </div>
                <span className="text-gray-500 text-[10px] w-10 text-right">Lv {hud.level}</span>
              </div>

              {/* Gold + Potions */}
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-yellow-400 font-bold text-xs tabular-nums">💰 {hud.gold}</span>
                <span className="text-purple-300 text-xs tabular-nums">🧪 ×{hud.potions}</span>
              </div>
            </div>

            {/* Top-right: map badge + PvP + minimap spacer */}
            <div className="flex flex-col items-end gap-1.5">
              <div
                className="text-[11px] font-black px-2.5 py-1 rounded-lg"
                style={{
                  background: activeMap === "dungeon" ? "rgba(124,58,237,0.35)" : activeMap === "forest" ? "rgba(22,101,52,0.35)" : "rgba(15,118,110,0.35)",
                  border: `1px solid ${activeMap === "dungeon" ? "rgba(167,139,250,0.5)" : activeMap === "forest" ? "rgba(74,222,128,0.4)" : "rgba(52,211,153,0.4)"}`,
                  color: activeMap === "dungeon" ? "#c4b5fd" : activeMap === "forest" ? "#86efac" : "#5eead4",
                }}
              >
                {hud.mapLabel}
              </div>

              {hud.isPvp && (
                <div
                  className="text-[11px] font-black px-2 py-0.5 rounded-lg animate-pulse"
                  style={{
                    background: "rgba(185,28,28,0.4)",
                    border: "1px solid rgba(248,113,113,0.55)",
                    color: "#fca5a5",
                    boxShadow: "0 0 10px rgba(220,38,38,0.4)",
                  }}
                >
                  {hud.isPvpCooldown ? "🛡️ SAFE 3s" : "⚔️ PvP ZONE"}
                </div>
              )}

              {/* Spacer for PixiJS minimap */}
              <div className="w-[88px] h-[88px]" />
            </div>
          </div>

          {/* Center event log */}
          {hud.log.length > 0 && (
            <div className="flex flex-col items-center gap-1 pointer-events-none">
              {hud.log.slice(0, 3).map((msg, i) => (
                <div
                  key={i}
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{
                    background: "rgba(0,0,0,0.7)",
                    color: i === 0 ? "#fbbf24" : "#9ca3af",
                    opacity: 1 - i * 0.3,
                    backdropFilter: "blur(6px)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {msg}
                </div>
              ))}
            </div>
          )}

          {/* Bottom row */}
          <div className="flex items-end justify-between gap-2">

            {/* Quest tracker */}
            <div
              className="rounded-xl px-3 py-2 max-w-[190px]"
              style={{
                background: "rgba(7,13,26,0.82)",
                border: "1px solid rgba(55,65,81,0.6)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div className="text-gray-500 text-[10px] font-black mb-0.5 tracking-wider">QUEST</div>
              <div className="text-yellow-200 text-xs leading-tight">{hud.questText}</div>
            </div>

            {/* Skill bar (passive display — first skill slot) */}
            <div className="flex items-end gap-1.5">
              {/* Skill slot */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{
                  background: "rgba(55,65,81,0.7)",
                  border: "1px solid rgba(107,114,128,0.4)",
                }}
              >
                ⚔️
              </div>

              {/* Potion */}
              <button
                onClick={handlePotion}
                className="pointer-events-auto w-12 h-12 rounded-full flex items-center justify-center text-xl active:scale-90 transition-transform"
                style={{
                  background: hud.potions > 0 ? "rgba(157,23,77,0.5)" : "rgba(55,65,81,0.5)",
                  border: `2px solid ${hud.potions > 0 ? "rgba(249,168,212,0.5)" : "rgba(107,114,128,0.3)"}`,
                  boxShadow: hud.potions > 0 ? "0 0 12px rgba(219,39,119,0.4)" : "none",
                }}
              >
                🧪
              </button>
            </div>
          </div>

          {/* Tap hint */}
          <div
            className="absolute pointer-events-none text-gray-600 text-[10px]"
            style={{ bottom: 56, left: "50%", transform: "translateX(-50%)" }}
          >
            Tap map to move
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * renderer.ts — Procedural pixel-art rendering for PixiJS 7
 *
 * All visuals are drawn programmatically — no external asset files needed.
 * Style: HD pixel-art with glowing effects, rich gradients, 64×64 high-res sprites, dynamic lighting.
 */

import type { AnyEntity, ZoneId, MonsterKind } from "@/features/mmo/types";
import { MONSTER_DEFS, ZONE_DEFS } from "@/features/mmo/types";
import type { TileGrid } from "@/features/mmo/server/game-world";

// ─── Load PixiJS from CDN ─────────────────────────────────────────────────

export function loadPixiJS(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).PIXI) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.3.2/pixi.min.js";
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

const PIXI = () => (window as any).PIXI;

// ─── Texture cache ────────────────────────────────────────────────────────

const _texCache = new Map<string, any>();

function cachedTex(key: string, fn: () => any): any {
  if (!_texCache.has(key)) _texCache.set(key, fn());
  return _texCache.get(key);
}

export function clearTexCache() { _texCache.clear(); }

// ─── Tile colors ──────────────────────────────────────────────────────────

const TILE_COLORS: Record<number, { base: number; accent: number; border: number }> = {
  0: { base: 0x000000, accent: 0x000000, border: 0x000000 }, // void
  1: { base: 0x5a9e50, accent: 0x6db862, border: 0x3d7a38 }, // grass
  2: { base: 0xc8a87a, accent: 0xdbb890, border: 0xa08860 }, // path
  3: { base: 0x4488cc, accent: 0x66aaee, border: 0x2266aa }, // water
  4: { base: 0x6a6a7a, accent: 0x8a8a9a, border: 0x3a3a4a }, // wall
  5: { base: 0x8c7252, accent: 0xa08862, border: 0x6a5238 }, // dirt
};

// ─── Draw tile texture ────────────────────────────────────────────────────

export function makeTileTexture(tileId: number, animated = false): any {
  const key = `tile_${tileId}_${animated}`;
  return cachedTex(key, () => {
    const TILE = 48; // Increased from 32 to 48 for HD sprites
    const canvas = document.createElement("canvas");
    canvas.width = TILE; canvas.height = TILE;
    const ctx = canvas.getContext("2d")!;
    const col = TILE_COLORS[tileId] ?? TILE_COLORS[1];

    // Base fill
    ctx.fillStyle = hexToCSS(col.base);
    ctx.fillRect(0, 0, TILE, TILE);

    // Pixel detail
    if (tileId === 1) { // grass — scattered dots
      ctx.fillStyle = hexToCSS(col.accent);
      for (let i = 0; i < 8; i++) {
        const gx = (Math.sin(i * 2.3) * 0.5 + 0.5) * 28 + 2;
        const gy = (Math.cos(i * 1.7) * 0.5 + 0.5) * 28 + 2;
        ctx.fillRect(Math.floor(gx), Math.floor(gy), 2, 2);
      }
    } else if (tileId === 2) { // path — pebble texture
      ctx.fillStyle = hexToCSS(col.accent);
      for (let py = 4; py < TILE; py += 8) {
        for (let px = 4; px < TILE; px += 8) {
          ctx.fillRect(px + (py % 4), py, 3, 2);
        }
      }
    } else if (tileId === 3) { // water — wave lines
      ctx.fillStyle = hexToCSS(col.accent);
      for (let wy = 6; wy < TILE; wy += 8) {
        for (let wx = 0; wx < TILE; wx += 4) {
          ctx.fillRect(wx, wy + (wx % 8 === 0 ? 1 : 0), 3, 1);
        }
      }
    } else if (tileId === 4) { // wall — brick pattern
      ctx.fillStyle = hexToCSS(col.accent);
      for (let by = 0; by < TILE; by += 8) {
        const offset = (by / 8 % 2) * 4;
        for (let bx = offset; bx < TILE; bx += 8) {
          ctx.strokeStyle = hexToCSS(col.border);
          ctx.lineWidth = 1;
          ctx.strokeRect(bx + 0.5, by + 0.5, 7, 7);
        }
      }
    } else if (tileId === 5) { // dirt — rough texture
      ctx.fillStyle = hexToCSS(col.accent);
      for (let i = 0; i < 6; i++) {
        const dx = ((i * 13) % 28) + 2;
        const dy = ((i * 7)  % 28) + 2;
        ctx.fillRect(dx, dy, 2 + (i % 2), 1 + (i % 2));
      }
    }

    // Subtle border
    ctx.strokeStyle = hexToCSS(col.border);
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    ctx.globalAlpha = 1;

    return PIXI().Texture.from(canvas);
  });
}

// ─── Draw character sprite ─────────────────────────────────────────────────

export type SpriteClass = "warrior" | "mage" | "rogue" | "healer" | "agent_w" | "agent_m" | "agent_r" | "agent_h";

const CLASS_PALETTES: Record<SpriteClass, { body: string; armor: string; hair: string; weapon: string }> = {
  warrior:  { body: "#f0d0a8", armor: "#5588cc", hair: "#8b5e3c", weapon: "#c0c0c0" },
  mage:     { body: "#f0d0a8", armor: "#9944cc", hair: "#e8d870", weapon: "#aa66ff" },
  rogue:    { body: "#f0d0a8", armor: "#2a5a2a", hair: "#2a2a2a", weapon: "#cc8800" },
  healer:   { body: "#f0d0a8", armor: "#cc8844", hair: "#e8b8a0", weapon: "#ffdd44" },
  agent_w:  { body: "#f0d0a8", armor: "#4466aa", hair: "#6a4428", weapon: "#aaaaaa" },
  agent_m:  { body: "#f0d0a8", armor: "#7733aa", hair: "#cccc44", weapon: "#9955ff" },
  agent_r:  { body: "#f0d0a8", armor: "#226622", hair: "#111111", weapon: "#bb7700" },
  agent_h:  { body: "#f0d0a8", armor: "#bb7733", hair: "#ddaa88", weapon: "#ffcc33" },
};

export function makeCharacterTexture(cls: SpriteClass, dir: "down" | "up" | "left" | "right", frame: 0 | 1 = 0): any {
  const key = `char_${cls}_${dir}_${frame}`;
  return cachedTex(key, () => {
    const S = 32;
    const canvas = document.createElement("canvas");
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext("2d")!;
    const pal = CLASS_PALETTES[cls];

    const walkBob = frame === 1 ? 1 : 0;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(16, 29, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = pal.armor;
    if (dir === "down" || dir === "up") {
      ctx.fillRect(10, 20 + walkBob, 5, 7);
      ctx.fillRect(17, 20 - walkBob, 5, 7);
    } else {
      ctx.fillRect(10, 20, 12, 6);
    }

    // Body
    ctx.fillStyle = pal.armor;
    ctx.fillRect(9, 11, 14, 11);
    // Body outline
    ctx.strokeStyle = darken(pal.armor, 0.4);
    ctx.lineWidth = 1;
    ctx.strokeRect(9.5, 11.5, 13, 10);

    // Head
    ctx.fillStyle = pal.body;
    ctx.fillRect(10, 3, 12, 10);
    ctx.strokeStyle = darken(pal.body, 0.3);
    ctx.lineWidth = 1;
    ctx.strokeRect(10.5, 3.5, 11, 9);

    // Hair
    ctx.fillStyle = pal.hair;
    ctx.fillRect(10, 2, 12, 4);
    ctx.fillRect(10, 3, 2, 8); // left side
    ctx.fillRect(20, 3, 2, 8); // right side

    // Eyes
    if (dir === "down") {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(12, 8, 2, 2);
      ctx.fillRect(18, 8, 2, 2);
      // Eye shine
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(12, 8, 1, 1);
      ctx.fillRect(18, 8, 1, 1);
    } else if (dir === "up") {
      // Back of head, no eyes
      ctx.fillStyle = pal.hair;
      ctx.fillRect(10, 3, 12, 9);
    } else {
      // Side eye
      ctx.fillStyle = "#1a1a2e";
      const ex = dir === "right" ? 19 : 11;
      ctx.fillRect(ex, 8, 2, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(ex, 8, 1, 1);
    }

    // Weapon
    ctx.fillStyle = pal.weapon;
    if (dir === "right") {
      ctx.fillRect(22, 12, 3, 10);
      ctx.fillRect(20, 11, 7, 3);
    } else if (dir === "left") {
      ctx.fillRect(7, 12, 3, 10);
      ctx.fillRect(5, 11, 7, 3);
    } else if (dir === "down") {
      ctx.fillRect(22, 16, 2, 10);
    } else {
      ctx.fillRect(22, 8, 2, 10);
    }

    return PIXI().Texture.from(canvas);
  });
}

// ─── Monster sprites ───────────────────────────────────────────────────────

export function makeMonsterTexture(kind: MonsterKind, frame: 0 | 1 = 0): any {
  const key = `monster_${kind}_${frame}`;
  return cachedTex(key, () => {
    const def = MONSTER_DEFS[kind];
    const S   = kind === "boss_nethervoid" ? 96 : 48; // HD boss and creature sizes
    const canvas = document.createElement("canvas");
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext("2d")!;

    const bob = frame === 1 ? 1 : 0;
    const bc  = numToCSS(def.bodyColor);
    const ec  = numToCSS(def.eyeColor);
    const ac  = numToCSS(def.accentColor);
    const dark = darken(bc, 0.35);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(S / 2, S - 4, S * 0.35, S * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    if (kind === "poring") {
      // Round slime body
      ctx.fillStyle = bc;
      ctx.beginPath();
      ctx.arc(S / 2, S / 2 - 2 + bob, S * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Eyes
      ctx.fillStyle = ec;
      ctx.beginPath(); ctx.arc(S / 2 - 5, S / 2 - 4 + bob, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(S / 2 + 5, S / 2 - 4 + bob, 3, 0, Math.PI * 2); ctx.fill();
      // Blush
      ctx.fillStyle = "rgba(255,150,150,0.5)";
      ctx.beginPath(); ctx.ellipse(S / 2 - 6, S / 2 + 1 + bob, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(S / 2 + 6, S / 2 + 1 + bob, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
      // Antenna
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(S / 2, S / 2 - 12 + bob); ctx.lineTo(S / 2 + 2, S / 2 - 18 + bob); ctx.stroke();
      ctx.fillStyle = ac;
      ctx.beginPath(); ctx.arc(S / 2 + 2, S / 2 - 19 + bob, 3, 0, Math.PI * 2); ctx.fill();
    } else if (kind === "lunatic") {
      // Rabbit-like creature
      ctx.fillStyle = bc;
      ctx.fillRect(S / 2 - 9, S / 2 - 4 + bob, 18, 14);
      // Ears
      ctx.fillRect(S / 2 - 7, S / 2 - 16 + bob, 5, 12);
      ctx.fillRect(S / 2 + 2, S / 2 - 16 + bob, 5, 12);
      ctx.fillStyle = ac;
      ctx.fillRect(S / 2 - 6, S / 2 - 15 + bob, 3, 10);
      ctx.fillRect(S / 2 + 3, S / 2 - 15 + bob, 3, 10);
      // Head
      ctx.fillStyle = bc;
      ctx.beginPath(); ctx.arc(S / 2, S / 2 - 2 + bob, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = ec;
      ctx.beginPath(); ctx.arc(S / 2 - 3, S / 2 - 3 + bob, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(S / 2 + 3, S / 2 - 3 + bob, 2, 0, Math.PI * 2); ctx.fill();
    } else if (kind === "zombie") {
      // Humanoid figure
      ctx.fillStyle = bc;
      ctx.fillRect(S / 2 - 7, S / 2 + 1 + bob, 14, 12); // body
      ctx.fillRect(S / 2 - 9, S / 2 - 12 + bob, 18, 14); // head
      ctx.strokeStyle = dark; ctx.lineWidth = 1;
      ctx.strokeRect(S / 2 - 9.5, S / 2 - 12.5 + bob, 19, 15);
      // Torn clothing
      ctx.fillStyle = darken(bc, 0.25);
      ctx.fillRect(S / 2 - 6, S / 2 + 3 + bob, 3, 10);
      // Eyes
      ctx.fillStyle = ec;
      ctx.fillRect(S / 2 - 6, S / 2 - 8 + bob, 3, 3);
      ctx.fillRect(S / 2 + 3, S / 2 - 8 + bob, 3, 3);
      // Arms outstretched
      ctx.fillStyle = bc;
      ctx.fillRect(S / 2 - 14, S / 2 + 3 + bob, 6, 3);
      ctx.fillRect(S / 2 + 8, S / 2 + 3 + bob, 6, 3);
    } else if (kind === "skeleton") {
      // Bone structure
      ctx.fillStyle = bc;
      ctx.fillRect(S / 2 - 6, S / 2 + 2 + bob, 12, 12); // ribs/body
      ctx.beginPath(); ctx.arc(S / 2, S / 2 - 6 + bob, 8, 0, Math.PI * 2); ctx.fill(); // skull
      ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
      // Eye sockets
      ctx.fillStyle = ec;
      ctx.beginPath(); ctx.arc(S / 2 - 3, S / 2 - 7 + bob, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(S / 2 + 3, S / 2 - 7 + bob, 2.5, 0, Math.PI * 2); ctx.fill();
      // Bones
      ctx.strokeStyle = darken(bc, 0.3); ctx.lineWidth = 2;
      for (let r = 0; r < 3; r++) {
        ctx.beginPath();
        ctx.moveTo(S / 2 - 6, S / 2 + 4 + r * 3 + bob);
        ctx.lineTo(S / 2 + 6, S / 2 + 4 + r * 3 + bob);
        ctx.stroke();
      }
      // Sword
      ctx.strokeStyle = "#aaccff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(S / 2 + 9, S / 2 - 8 + bob); ctx.lineTo(S / 2 + 14, S / 2 + 8 + bob); ctx.stroke();
    } else if (kind === "drake") {
      // Dragon/drake
      ctx.fillStyle = bc;
      ctx.fillRect(S / 2 - 11, S / 2 - 2 + bob, 22, 16); // body
      // Head
      ctx.fillRect(S / 2 + 6, S / 2 - 8 + bob, 12, 10);
      ctx.strokeStyle = dark; ctx.lineWidth = 1;
      ctx.strokeRect(S / 2 + 6.5, S / 2 - 7.5 + bob, 11, 9);
      // Wings
      ctx.fillStyle = ac;
      ctx.fillRect(S / 2 - 14, S / 2 - 8 + bob, 7, 12);
      ctx.fillRect(S / 2 + 7, S / 2 - 12 + bob, 7, 14);
      // Eyes
      ctx.fillStyle = def.eyeColor > 0 ? numToCSS(def.eyeColor) : "#ff4400";
      ctx.fillRect(S / 2 + 14, S / 2 - 6 + bob, 3, 3);
      // Scales
      ctx.strokeStyle = darken(bc, 0.2); ctx.lineWidth = 1;
      for (let sc = 0; sc < 4; sc++) {
        ctx.beginPath();
        ctx.arc(S / 2 - 6 + sc * 5, S / 2 + 4 + bob, 3, Math.PI, 0);
        ctx.stroke();
      }
    } else if (kind === "boss_baphomet") {
      // Massive boss — uses 64×64 canvas
      const cx = 32; const cy = 32;
      // Cloak
      ctx.fillStyle = numToCSS(def.accentColor);
      ctx.fillRect(cx - 18, cy, 36, 28 + bob);
      // Body
      ctx.fillStyle = bc;
      ctx.fillRect(cx - 13, cy - 4 + bob, 26, 24);
      ctx.strokeStyle = "#220000"; ctx.lineWidth = 2;
      ctx.strokeRect(cx - 13.5, cy - 4.5 + bob, 27, 25);
      // Head
      ctx.fillStyle = "#2a1a1a";
      ctx.beginPath(); ctx.arc(cx, cy - 14 + bob, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#440000"; ctx.lineWidth = 2; ctx.stroke();
      // Horns
      ctx.fillStyle = "#5a2a00";
      ctx.fillRect(cx - 16, cy - 30 + bob, 6, 18);
      ctx.fillRect(cx + 10, cy - 30 + bob, 6, 18);
      // Glowing eyes
      ctx.fillStyle = ec;
      ctx.beginPath(); ctx.arc(cx - 5, cy - 15 + bob, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 5, cy - 15 + bob, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,100,0,0.6)";
      ctx.beginPath(); ctx.arc(cx - 5, cy - 15 + bob, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 5, cy - 15 + bob, 6, 0, Math.PI * 2); ctx.fill();
      // Scythe
      ctx.strokeStyle = "#8888cc"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx + 15, cy - 28 + bob); ctx.lineTo(cx + 20, cy + 28 + bob); ctx.stroke();
      ctx.strokeStyle = "#aaaaee"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx + 15, cy - 20 + bob, 10, -0.5, Math.PI * 0.5); ctx.stroke();
      // Wings
      ctx.fillStyle = "rgba(40,0,80,0.7)";
      ctx.beginPath();
      ctx.moveTo(cx - 13, cy + bob);
      ctx.quadraticCurveTo(cx - 40, cy - 20 + bob, cx - 30, cy - 30 + bob);
      ctx.quadraticCurveTo(cx - 20, cy - 10 + bob, cx - 13, cy + 10 + bob);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 13, cy + bob);
      ctx.quadraticCurveTo(cx + 40, cy - 20 + bob, cx + 30, cy - 30 + bob);
      ctx.quadraticCurveTo(cx + 20, cy - 10 + bob, cx + 13, cy + 10 + bob);
      ctx.fill();
    }

    return PIXI().Texture.from(canvas);
  });
}

// ─── NPC sprite ────────────────────────────────────────────────────────────

export function makeNpcTexture(role: "warp" | "shop" | "quest" | "healer"): any {
  const key = `npc_${role}`;
  return cachedTex(key, () => {
    const S = 48; // HD NPC size
    const canvas = document.createElement("canvas");
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext("2d")!;

    const colors: Record<string, { body: string; robe: string; detail: string }> = {
      warp:   { body: "#f0d0a8", robe: "#4455cc", detail: "#88aaff" },
      shop:   { body: "#f0d0a8", robe: "#cc8833", detail: "#ffcc66" },
      quest:  { body: "#f0d0a8", robe: "#33aa44", detail: "#88ffaa" },
      healer: { body: "#f0d0a8", robe: "#cc4444", detail: "#ff8888" },
    };
    const c = colors[role];

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath(); ctx.ellipse(16, 30, 9, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Robe
    ctx.fillStyle = c.robe;
    ctx.fillRect(8, 14, 16, 14);
    ctx.strokeStyle = darken(c.robe, 0.4); ctx.lineWidth = 1;
    ctx.strokeRect(8.5, 14.5, 15, 13);

    // Body
    ctx.fillStyle = c.body;
    ctx.fillRect(10, 8, 12, 8);

    // Head
    ctx.fillRect(9, 2, 14, 11);
    ctx.strokeStyle = darken(c.body, 0.3); ctx.lineWidth = 1;
    ctx.strokeRect(9.5, 2.5, 13, 10);

    // Hat / detail
    ctx.fillStyle = c.detail;
    ctx.fillRect(8, 1, 16, 4);
    ctx.fillRect(6, 2, 4, 6);
    ctx.fillRect(22, 2, 4, 6);

    // Eyes
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(12, 8, 2, 2);
    ctx.fillRect(18, 8, 2, 2);

    // Name tag glow
    ctx.strokeStyle = c.detail;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(8.5, 14.5, 15, 13);
    ctx.globalAlpha = 1;

    return PIXI().Texture.from(canvas);
  });
}

// ─── Damage float texture ─────────────────────────────────────────────────

export function makeDamageTexture(value: number, isCrit: boolean): any {
  const key = `dmg_${value}_${isCrit}`;
  return cachedTex(key, () => {
    const W = isCrit ? 64 : 40;
    const H = isCrit ? 24 : 18;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const fs = isCrit ? 18 : 13;
    const text = isCrit ? `${value}!!` : `${value}`;

    ctx.font = `bold ${fs}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Outline
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = isCrit ? 4 : 3;
    ctx.strokeText(text, W / 2, H / 2);

    // Fill
    ctx.fillStyle = isCrit ? "#ffdd00" : "#ffffff";
    ctx.fillText(text, W / 2, H / 2);

    return PIXI().Texture.from(canvas);
  });
}

// ─── Draw tilemap (returns Graphics for world layer) ─────────────────────

export function buildTilemapGraphics(grid: TileGrid): any {
  const P = PIXI();
  const container = new P.Container();

  for (let ty = 0; ty < grid.length; ty++) {
    for (let tx = 0; tx < (grid[ty]?.length ?? 0); tx++) {
      const tileId = grid[ty][tx];
      if (tileId === 0) continue;
      const tex = makeTileTexture(tileId);
      const spr = new P.Sprite(tex);
      spr.x = tx * 32;
      spr.y = ty * 32;
      container.addChild(spr);
    }
  }

  return container;
}

// ─── Minimap ──────────────────────────────────────────────────────────────

export function drawMinimap(
  P: any, layer: any,
  entities: AnyEntity[],
  gridW: number, gridH: number,
  playerX: number, playerY: number,
  offsetX: number, offsetY: number,
) {
  const MM  = 84;
  const MX  = offsetX;
  const MY  = offsetY;
  const sx  = MM / gridW;
  const sy  = MM / gridH;

  // BG
  const bg = new P.Graphics();
  bg.beginFill(0x0a0f1e, 0.88);
  bg.lineStyle(1, 0x4a6a8a, 0.9);
  bg.drawRoundedRect(MX, MY, MM, MM, 5);
  bg.endFill();
  layer.addChild(bg);

  // Entities
  for (const e of entities) {
    let color = 0x888888;
    if (e.type === "player")  color = 0x44ff88;
    else if (e.type === "agent")   color = 0x88aaff;
    else if (e.type === "monster") color = 0xff5555;
    else continue;

    const r = e.type === "player" ? 3 : 1.5;
    const ex = MX + e.x * sx;
    const ey = MY + e.y * sy;
    const dot = new P.Graphics();
    dot.beginFill(color, 0.95);
    dot.drawCircle(ex, ey, r);
    dot.endFill();
    layer.addChild(dot);
  }
}

// ─── Color utils ───────────────────────────────────────────────────────────

function hexToCSS(n: number): string {
  return "#" + n.toString(16).padStart(6, "0");
}

function numToCSS(n: number): string {
  return "#" + n.toString(16).padStart(6, "0");
}

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((n >> 8)  & 0xff) * (1 - amount));
  const b = Math.max(0, ((n >> 0)  & 0xff) * (1 - amount));
  return `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
}

/**
 * sprite-renderer.ts
 *
 * Procedural pixel-art sprite drawing on <canvas> — no external assets needed.
 * All sprites are drawn programmatically with 8x8 "pixel" blocks scaled up to 32–48px.
 *
 * Exported:
 *   drawCharacterSprite(ctx, type, x, y, size, opts)
 *   makeCharacterTexture(PIXI, type, size, opts) → cached PixiJS Texture
 */

export type SpriteType =
  | "warrior"   // player
  | "mage"      // agent – farmer
  | "rogue"     // agent – looter
  | "berserker" // agent – aggressive
  | "archer"    // agent – extra
  | "glimmerblob"     // enemy – forest (was slime)
  | "mooncap"   // enemy – forest (was mushroom)
  | "bat"       // enemy – cave/dungeon entrance
  | "bonebranch"  // enemy – dungeon (was skeleton)
  | "voidwing"     // enemy – dungeon elite (was drake)
  | "guildmaster" // npc
  | "merchant"    // npc
  | "crystal"   // loot / treasure
  ;

export interface SpriteOpts {
  color?: number;   // override primary palette color (RGB int)
  facing?: "left" | "right";
  frame?: number;   // animation frame 0 | 1 (for walking / idle bob)
}

// ─── 8-column pixel palette ───────────────────────────────────────────────
// Colors indexed 0–7 (each is [r,g,b])
const PAL: Record<string, [number,number,number][]> = {
  warrior: [
    [26,26,26],   // 0 outline / shadow
    [72,169,255], // 1 armor blue
    [122,209,255],// 2 armor highlight
    [240,220,180],// 3 skin
    [200,160,120],// 4 skin shadow
    [255,200,50], // 5 gold trim
    [180,60,60],  // 6 cape red
    [255,255,255],// 7 eye white
  ],
  mage: [
    [26,26,26],
    [130,80,200], // robe purple
    [190,140,255],
    [240,220,180],
    [200,160,120],
    [255,220,80], // staff glow
    [80,220,200], // magic cyan
    [255,255,255],
  ],
  rogue: [
    [26,26,26],
    [50,50,70],   // dark leather
    [90,90,120],
    [240,220,180],
    [200,160,120],
    [80,200,120], // green trim
    [255,150,50], // dagger orange
    [255,255,255],
  ],
  berserker: [
    [26,26,26],
    [180,40,40],  // red heavy armor
    [230,80,80],
    [240,200,160],
    [200,140,100],
    [255,180,50],
    [100,20,20],  // dark fur
    [255,255,255],
  ],
  archer: [
    [26,26,26],
    [80,130,60],  // forest green
    [120,180,90],
    [240,220,180],
    [200,160,120],
    [180,130,60], // brown wood
    [220,180,100],
    [255,255,255],
  ],
  glimmerblob: [      // was slime - crystalline blue
    [26,26,26],
    [127,216,232], // cyan base
    [184,230,213], // highlight
    [255,244,232], // glow
    [255,179,198], // inner pink
    [79,150,169], // shadow
    [255,255,255], // eye
    [44,62,80],
  ],
  mooncap: [       // was mushroom - purple cap
    [26,26,26],
    [212,167,232], // purple base
    [232,200,245], // light purple
    [255,232,248], // glow
    [155,89,182],  // magenta inner
    [136,50,120],  // shadow
    [255,255,255],
    [26,26,46],
  ],
  bat: [
    [26,26,26],
    [80,50,100],  // purple-grey
    [130,90,150],
    [60,30,80],
    [200,160,180],
    [255,180,255],
    [40,20,60],
    [255,180,150],
  ],
  bonebranch: [    // was skeleton - bone warrior
    [26,26,26],
    [232,224,200], // bone white
    [255,255,244],
    [200,192,176],
    [168,152,120],
    [200,160,60], // gold weapon
    [102,102,255], // ghost blue eyes
    [255,255,255],
  ],
  voidwing: [      // was drake - void serpent
    [26,26,26],
    [139,71,137], // void purple
    [167,101,182], // highlight
    [107,53,131], // shadow
    [255,140,0],  // eyes orange
    [255,180,50], // fire yellow
    [184,101,182],
    [255,255,255],
  ],
  guildmaster: [
    [26,26,26],
    [180,140,60], // gold robe
    [230,200,100],
    [240,220,180],
    [200,160,120],
    [255,220,50],
    [100,80,30],
    [255,255,255],
  ],
  merchant: [
    [26,26,26],
    [160,100,50], // brown coat
    [210,160,80],
    [240,220,180],
    [200,160,120],
    [220,180,60],
    [80,50,20],
    [255,255,255],
  ],
  crystal: [
    [26,26,26],
    [80,200,240], // ice blue
    [160,240,255],
    [40,160,200],
    [20,100,160],
    [200,255,255],
    [255,255,255],
    [180,220,255],
  ],
};

// ─── 16×16 pixel maps ─────────────────────────────────────────────────────
// Each row is 16 chars: 0–7 = palette index, '.' = transparent

const PIXELS: Record<SpriteType, string[]> = {
  warrior: [
    "......3333......",
    ".....334433.....",
    ".....333733.....",
    "......3733......",
    "....11111111....",
    "...1111551111...",
    "...1115551111...",
    "....11111111....",
    "...1111111111...",
    "..11111551111...",
    "..66111111166...",
    "..66.111111.66..",
    ".....11..11.....",
    ".....11..11.....",
    "....1111.1111...",
    "....1111.1111...",
  ],
  mage: [
    "......3333......",
    ".....334433.....",
    ".....333733.....",
    "......2222......",
    "....11111111....",
    "...1116611111...",
    "..111111111111..",
    "...1111111111...",
    "..111111111111..",
    ".11111111111111.",
    ".11111111111111.",
    "..6.11111111.6..",
    ".....11..11.....",
    ".....11..11.....",
    "....111..111....",
    "...61116.61116..",
  ],
  rogue: [
    "......3333......",
    ".....334433.....",
    ".....333733.....",
    "...0.2.0.2.0....",
    "....11111111....",
    "...1111111111...",
    "...1116611111...",
    "....11111111....",
    "...1111111111...",
    "..11111111111...",
    "..11.1111111...",
    "..666.1111.666..",
    ".....11..11.....",
    ".....11..11.....",
    "....111..111....",
    "....111..111....",
  ],
  berserker: [
    "......4444......",
    ".....443344.....",
    ".....444744.....",
    ".....1.44.1.....",
    "...11111111111..",
    "..1111155111111.",
    "..1111111111111.",
    "..111111111111..",
    "..111111111111..",
    ".1111111111111..",
    ".1111111111111..",
    ".11.1111111.11..",
    ".....11..11.....",
    ".....11..11.....",
    "...11111.11111..",
    "...11111.11111..",
  ],
  archer: [
    "......3333......",
    ".....334433.....",
    ".....333733.....",
    "......3733......",
    "....11111111....",
    "...1111111111...",
    "...1111651111...",
    "....11111111....",
    "6..11111111111..",
    "6.111111111111..",
    "6..11111111111..",
    ".....111111.....",
    ".....11..11.....",
    ".....11..11.....",
    "....111..111....",
    "....111..111....",
  ],
  slime: [
    "................",
    "......2222......",
    "....22222222....",
    "...2222222222...",
    "..222772727222..",
    "..222271272222..",
    "..222222222222..",
    "..222222222222..",
    "..222322222222..",
    "...2232222322...",
    "....22222222....",
    "......2222......",
    "................",
    "................",
    "................",
    "................",
  ],
  mushroom: [
    "....666666......",
    "...66611166.....",
    "..6611111166....",
    ".666111111666...",
    ".661611611616...",
    ".661611611616...",
    ".666111111666...",
    "..64444444644...",
    "..4444444444....",
    "...444444444....",
    "....44444444....",
    ".....44..44.....",
    "....444..444....",
    "...44444.44444..",
    "................",
    "................",
  ],
  bat: [
    "................",
    ".1..........1...",
    ".11..2222..11...",
    ".111.2222.111...",
    "11112222221111..",
    ".1122222222211..",
    "..12277272211...",
    "..12272272211...",
    "..122222222211..",
    "...122222221....",
    "....1222221.....",
    ".....12221......",
    "......121.......",
    "......121.......",
    "......111.......",
    "................",
  ],
  skeleton: [
    "......1111......",
    ".....111611.....",
    "....11161611....",
    ".....111111.....",
    "....11111111....",
    "...1111551111...",
    "...1111111111...",
    "....11111111....",
    "...1111111111...",
    "..11.111111.11..",
    "..3..111111..3..",
    ".....111111.....",
    ".....11..11.....",
    ".....11..11.....",
    "...5.111.111.5..",
    "...5.111.111.5..",
  ],
  drake: [
    "...........2222.",
    "..........222221",
    ".........222221.",
    "222222..22221...",
    "22222222222122..",
    "212222222222122.",
    "2121222222222122",
    "..21222222222422",
    "...212222224444.",
    "....2122224444..",
    "......1222444...",
    ".......12244....",
    "........14444...",
    "........14444...",
    "..........444...",
    "................",
  ],
  guildmaster: [
    "......3333......",
    ".....334433.....",
    ".....333733.....",
    "......2222......",
    "....22222222....",
    "...2222552222...",
    "...2225552222...",
    "....22222222....",
    "...2222222222...",
    "..22222552222...",
    "..22222222222...",
    "..22.22222.22...",
    ".....11..11.....",
    ".....11..11.....",
    "....2211.1122...",
    "....2211.1122...",
  ],
  merchant: [
    "......3333......",
    ".....334433.....",
    ".....333733.....",
    "......5555......",
    "....11111111....",
    "...1111111111...",
    "...1111551111...",
    "....11111111....",
    "...1111111111...",
    "..11.111111.11..",
    "..1..111111..1..",
    "..6..111111..6..",
    ".....11..11.....",
    ".....11..11.....",
    "....111..111....",
    "....111..111....",
  ],
  crystal: [
    "......5555......",
    ".....556655.....",
    "....55565555....",
    "...5556555555...",
    "..5555555555555.",
    "..5155555555515.",
    "..5115555555115.",
    "..5551555551555.",
    "..5555155515555.",
    "..5555555555555.",
    "...555555555555.",
    "....5555555555..",
    ".....5555555....",
    "......55555.....",
    ".......555......",
    "........5.......",
  ],
};

// ─── Frame animation offsets (subtle body bob) ────────────────────────────
// frame 0 = normal, frame 1 = nudge down 1 pixel on legs

const WALK_ROWS: Record<SpriteType, number> = {
  warrior: 13, mage: 13, rogue: 13, berserker: 14,
  archer: 13, slime: 8, mushroom: 10, bat: 12,
  skeleton: 13, drake: 12, guildmaster: 13, merchant: 13,
  crystal: 0,
};

// ─── Draw ─────────────────────────────────────────────────────────────────

export function drawCharacterSprite(
  ctx: CanvasRenderingContext2D,
  type: SpriteType,
  x: number,
  y: number,
  size: number,
  opts: SpriteOpts = {},
) {
  const { facing = "right", frame = 0 } = opts;
  const rows = PIXELS[type] ?? PIXELS.warrior;
  const pal   = PAL[type]   ?? PAL.warrior;
  const GRID  = 16;
  const PX    = size / GRID; // pixel block size in canvas units

  ctx.save();

  if (facing === "left") {
    // flip horizontally around center
    ctx.translate(x + size / 2, y);
    ctx.scale(-1, 1);
    ctx.translate(-(size / 2), 0);
  } else {
    ctx.translate(x, y);
  }

  for (let row = 0; row < GRID; row++) {
    const line = rows[row] ?? "";
    for (let col = 0; col < GRID; col++) {
      const ch = line[col];
      if (!ch || ch === ".") continue;
      const idx = parseInt(ch, 10);
      if (isNaN(idx)) continue;
      const rgb = pal[idx];
      if (!rgb) continue;

      // Animate walk — shift legs down slightly on frame 1
      let rowOffset = 0;
      if (frame === 1 && row >= (WALK_ROWS[type] ?? 13)) {
        rowOffset = PX * 0.5;
      }

      ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      ctx.fillRect(col * PX, row * PX + rowOffset, PX, PX);
    }
  }

  ctx.restore();
}

// ─── PixiJS texture factory with cache ────────────────────────────────────

const _textureCache = new Map<string, any>();

export function makeCharacterTexture(
  PIXI: any,
  type: SpriteType,
  size: number = 48,
  opts: SpriteOpts = {},
): any {
  const key = `${type}_${size}_${opts.facing ?? "right"}_${opts.frame ?? 0}`;
  if (_textureCache.has(key)) return _textureCache.get(key);

  const canvas = document.createElement("canvas");
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  drawCharacterSprite(ctx, type, 0, 0, size, opts);

  const tex = PIXI.Texture.from(canvas);
  _textureCache.set(key, tex);
  return tex;
}

export function clearSpriteCache() {
  _textureCache.clear();
}

// ─── Entity type → SpriteType mapping ────────────────────────────────────

export function entityToSprite(
  type: string,
  subtype?: string,
  personality?: string,
): SpriteType {
  if (type === "player") return "warrior";

  if (type === "agent") {
    if (personality === "aggressive") return "berserker";
    if (personality === "looter")     return "rogue";
    if (personality === "farmer")     return "mage";
    return "archer";
  }

  if (type === "npc") {
    if (subtype === "guildmaster" || subtype?.includes("guild")) return "guildmaster";
    return "merchant";
  }

  if (type === "enemy") {
    if (subtype === "forest")  return Math.random() > 0.5 ? "glimmerblob" : "mooncap";
    if (subtype === "dungeon") return Math.random() > 0.4 ? "bonebranch" : "voidwing";
    if (subtype === "cave")    return "bat";
    return "glimmerblob";
  }

  return "glimmerblob";
}

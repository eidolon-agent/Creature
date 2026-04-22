// ─── CreatureQuest MMORPG — Shared Types ──────────────────────────────────

export type EntityType = "player" | "agent" | "monster" | "npc";
export type Direction  = "up" | "down" | "left" | "right";
export type ZoneId     = "crystal_haven" | "whispering_woods" | "shadowfall" | "sunscorched";
export type MonsterKind = "glimmerblob" | "mooncap" | "rotwood" | "bonebranch" | "voidwing" | "boss_nethervoid";
export type AIState = "idle" | "wander" | "chase" | "attack" | "flee" | "farm" | "return";
export type AgentPersonality = "warrior" | "mage" | "rogue" | "healer";

// ─── Tile types ────────────────────────────────────────────────────────────

export type TileType =
  | "grass" | "grass2" | "grass3"
  | "dirt"  | "dirt2"
  | "path"  | "path_h" | "path_v" | "path_corner_tl" | "path_corner_tr" | "path_corner_bl" | "path_corner_br"
  | "water" | "water2"
  | "wall"  | "wall_top" | "wall_side"
  | "floor" | "floor2"
  | "void";

export interface TileDef {
  type: TileType;
  walkable: boolean;
  color: number;      // PixiJS hex
  accent: number;     // detail layer color
  border: number;     // outline color
}

// ─── World constants ───────────────────────────────────────────────────────

export const TILE   = 32;          // px per tile
export const TICK_MS = 80;         // ~12 ticks/sec server loop
export const INTEREST_RADIUS = 12; // tiles, entities outside this are not sent

export const ZONE_DEFS: Record<ZoneId, ZoneDef> = {
  crystal_haven: {
    id: "crystal_haven", name: "Crystal Haven",
    width: 40, height: 40,
    bgColor: 0x4A7C59, accentColor: 0x7FD8E8,
    spawnX: 20, spawnY: 20,
    monsters: ["glimmerblob", "mooncap"],
    ambience: "town",
  },
  whispering_woods: {
    id: "whispering_woods", name: "Whispering Woods",
    width: 50, height: 50,
    bgColor: 0x2D5A1E, accentColor: 0xB8E6D5,
    spawnX: 5, spawnY: 25,
    monsters: ["rotwood", "bonebranch"],
    ambience: "forest",
  },
  shadowfall: {
    id: "shadowfall", name: "Shadowfall",
    width: 45, height: 45,
    bgColor: 0x1A1A2E, accentColor: 0x8B4789,
    spawnX: 22, spawnY: 5,
    monsters: ["bonebranch", "voidwing", "boss_nethervoid"],
    ambience: "dungeon",
  },
  sunscorched: {
    id: "sunscorched", name: "Sunscorched Expanse",
    width: 48, height: 48,
    bgColor: 0x8B6914, accentColor: 0xFF6B35,
    spawnX: 24, spawnY: 24,
    monsters: ["glimmerblob", "rotwood"],
    ambience: "desert",
  },
};

export interface ZoneDef {
  id: ZoneId;
  name: string;
  width: number;  // tiles
  height: number; // tiles
  bgColor: number;
  accentColor: number;
  spawnX: number;
  spawnY: number;
  monsters: MonsterKind[];
  ambience: "town" | "forest" | "dungeon" | "desert";
}

// ─── Entity interfaces ─────────────────────────────────────────────────────

export interface Vec2 { x: number; y: number; }

export interface BaseEntity {
  id: string;
  type: EntityType;
  zone: ZoneId;
  x: number;       // tile X
  y: number;       // tile Y
  px: number;      // pixel X (interpolated)
  py: number;      // pixel Y (interpolated)
  dir: Direction;
  hp: number;
  maxHp: number;
  name: string;
  isDead: boolean;
  deathAt: number; // timestamp, 0 = alive
}

export interface PlayerEntity extends BaseEntity {
  type: "player";
  fid: number;
  xp: number;
  xpNext: number;
  level: number;
  gold: number;
  attackDamage: number;
  attackRange: number;   // tiles
  attackCoolMs: number;
  lastAttackAt: number;
  moveSpeed: number;     // tiles/sec
  destX: number;
  destY: number;
  kills: number;
}

export interface AgentEntity extends BaseEntity {
  type: "agent";
  personality: AgentPersonality;
  aiState: AIState;
  targetId: string | null;
  homeX: number;
  homeY: number;
  xp: number;
  xpNext: number;
  level: number;
  gold: number;
  attackDamage: number;
  attackRange: number;
  attackCoolMs: number;
  lastAttackAt: number;
  moveSpeed: number;
  destX: number;
  destY: number;
  kills: number;
  wanderTimer: number;
}

export interface MonsterEntity extends BaseEntity {
  type: "monster";
  kind: MonsterKind;
  aiState: AIState;
  targetId: string | null;
  aggroRange: number;   // tiles
  fleeHpPct: number;    // flee below this HP %
  attackDamage: number;
  attackRange: number;
  attackCoolMs: number;
  lastAttackAt: number;
  moveSpeed: number;
  destX: number;
  destY: number;
  xpReward: number;
  goldReward: number;
  respawnDelaySec: number;
  spawnX: number;
  spawnY: number;
  wanderTimer: number;
}

export interface NpcEntity extends BaseEntity {
  type: "npc";
  role: "warp" | "shop" | "quest" | "healer";
  destZone?: ZoneId;
}

export type AnyEntity = PlayerEntity | AgentEntity | MonsterEntity | NpcEntity;

// ─── Combat / events ───────────────────────────────────────────────────────

export interface DamageEvent {
  attackerId: string;
  targetId: string;
  damage: number;
  isCrit: boolean;
  timestamp: number;
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

// ─── World snapshot (what server sends to clients) ────────────────────────

export interface ZoneSnapshot {
  tick: number;
  zoneId: ZoneId;
  entities: AnyEntity[];
  events: DamageEvent[];
  chat: ChatMessage[];
}

// ─── Client → Server messages ─────────────────────────────────────────────

export interface MoveInput {
  playerId: string;
  destX: number;
  destY: number;
  zone: ZoneId;
}

export interface AttackInput {
  playerId: string;
  targetId: string;
  zone: ZoneId;
}

// ─── Monster definitions ───────────────────────────────────────────────────

export const MONSTER_DEFS: Record<MonsterKind, {
  name: string;
  maxHp: number;
  damage: number;
  speed: number;
  aggroRange: number;
  fleeHpPct: number;
  xpReward: number;
  goldReward: number;
  respawnDelaySec: number;
  // visual
  bodyColor: number;
  eyeColor: number;
  accentColor: number;
  size: number; // tile fractions, 1 = one tile
}> = {
  glimmerblob: {
    name: "Glimmerblob", maxHp: 60, damage: 10, speed: 1.4, aggroRange: 3,
    fleeHpPct: 0, xpReward: 15, goldReward: 8, respawnDelaySec: 8,
    bodyColor: 0x7FD8E8, eyeColor: 0xFFB3C6, accentColor: 0xB8E6D5, size: 0.9,
  },
  mooncap: {
    name: "Mooncap Sprout", maxHp: 90, damage: 16, speed: 1.6, aggroRange: 4,
    fleeHpPct: 0.2, xpReward: 25, goldReward: 12, respawnDelaySec: 10,
    bodyColor: 0xD4A7E8, eyeColor: 0x9B59B6, accentColor: 0xE8C8F5, size: 1.0,
  },
  rotwood: {
    name: "Rotwood Stalker", maxHp: 180, damage: 28, speed: 0.9, aggroRange: 5,
    fleeHpPct: 0, xpReward: 45, goldReward: 22, respawnDelaySec: 15,
    bodyColor: 0x4A7C59, eyeColor: 0xFF4444, accentColor: 0x2D5A1E, size: 1.0,
  },
  bonebranch: {
    name: "Bonebranch Reaver", maxHp: 260, damage: 42, speed: 1.3, aggroRange: 6,
    fleeHpPct: 0, xpReward: 70, goldReward: 38, respawnDelaySec: 18,
    bodyColor: 0xE8E0C8, eyeColor: 0x6666FF, accentColor: 0xC8C0A8, size: 1.1,
  },
  voidwing: {
    name: "Voidwing Serpent", maxHp: 580, damage: 88, speed: 1.7, aggroRange: 7,
    fleeHpPct: 0, xpReward: 150, goldReward: 80, respawnDelaySec: 25,
    bodyColor: 0x8B4789, eyeColor: 0xFF8C00, accentColor: 0xA765B6, size: 1.3,
  },
  boss_nethervoid: {
    name: "Nethervoid Titan", maxHp: 4200, damage: 210, speed: 1.1, aggroRange: 10,
    fleeHpPct: 0, xpReward: 1200, goldReward: 600, respawnDelaySec: 120,
    bodyColor: 0x1A0A2E, eyeColor: 0xFF2200, accentColor: 0x3A1A5E, size: 2.2,
  },
};

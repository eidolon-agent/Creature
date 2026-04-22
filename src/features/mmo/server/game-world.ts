// ─── Authoritative Server Game World ──────────────────────────────────────
// Runs as a singleton in the Next.js server process.
// Tick rate: ~12/sec (80ms). Zone-sharded for scalability.

import {
  type AnyEntity, type PlayerEntity, type AgentEntity,
  type MonsterEntity, type NpcEntity, type ZoneId,
  type ZoneDef, type DamageEvent, type ZoneSnapshot,
  ZONE_DEFS, MONSTER_DEFS, TICK_MS, INTEREST_RADIUS,
  type MonsterKind, type AgentPersonality, type AIState,
} from "@/features/mmo/types";

// ─── Utility ──────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

// ─── Tilemap generation ────────────────────────────────────────────────────

type TileGrid = number[][]; // 0=void, 1=grass, 2=path, 3=water, 4=wall, 5=dirt

export function generateTilemap(zone: ZoneDef): TileGrid {
  const { width: W, height: H, ambience } = zone;
  const grid: TileGrid = Array.from({ length: H }, () => new Array(W).fill(1));

  // Borders as wall/water
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
        grid[y][x] = ambience === "dungeon" ? 4 : 3;
      }
    }
  }

  // Central path cross
  const cx = Math.floor(W / 2);
  const cy = Math.floor(H / 2);
  for (let x = 1; x < W - 1; x++) grid[cy][x] = 2;
  for (let y = 1; y < H - 1; y++) grid[y][cx] = 2;

  // Zone-specific decoration patches
  if (ambience === "forest" || ambience === "town") {
    // Scatter dirt patches
    for (let i = 0; i < 20; i++) {
      const px = randInt(2, W - 3);
      const py = randInt(2, H - 3);
      const r  = randInt(1, 3);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = clamp(px + dx, 1, W - 2);
          const ty = clamp(py + dy, 1, H - 2);
          if (grid[ty][tx] === 1) grid[ty][tx] = 5;
        }
      }
    }
    // Small water ponds
    for (let i = 0; i < (ambience === "forest" ? 4 : 2); i++) {
      const px = randInt(3, W - 4);
      const py = randInt(3, H - 4);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = clamp(px + dx, 1, W - 2);
          const ty = clamp(py + dy, 1, H - 2);
          if (grid[ty][tx] !== 2) grid[ty][tx] = 3;
        }
      }
    }
  }

  if (ambience === "dungeon") {
    // Fill with floor, scatter walls
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        grid[y][x] = 5;
      }
    }
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (grid[y][x] !== 2 && Math.random() < 0.07) grid[y][x] = 4;
      }
    }
  }

  if (ambience === "desert") {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        grid[y][x] = Math.random() < 0.4 ? 5 : 1;
      }
    }
    for (let x = 1; x < W - 1; x++) grid[cy][x] = 2;
    for (let y = 1; y < H - 1; y++) grid[y][cx] = 2;
  }

  // Re-stamp spawn clear
  const { spawnX, spawnY } = zone;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const tx = clamp(spawnX + dx, 1, W - 2);
      const ty = clamp(spawnY + dy, 1, H - 2);
      grid[ty][tx] = ambience === "dungeon" ? 5 : 1;
    }
  }

  return grid;
}

function isWalkable(grid: TileGrid, x: number, y: number): boolean {
  const H = grid.length;
  const W = grid[0]?.length ?? 0;
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  const t = grid[y][x];
  return t !== 0 && t !== 3 && t !== 4; // not void/water/wall
}

// ─── Zone state ────────────────────────────────────────────────────────────

interface ZoneState {
  def: ZoneDef;
  grid: TileGrid;
  entities: Map<string, AnyEntity>;
  events: DamageEvent[];
  chat: { senderId: string; senderName: string; text: string; timestamp: number }[];
  tick: number;
}

// ─── World singleton ───────────────────────────────────────────────────────

class GameWorld {
  zones: Map<ZoneId, ZoneState> = new Map();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private pendingMoves: Map<string, { destX: number; destY: number }> = new Map();
  private pendingAttacks: Map<string, string> = new Map(); // attackerId → targetId

  constructor() {
    this.initZones();
    this.startTickLoop();
  }

  // ── Init ────────────────────────────────────────────────────────────────
  private initZones() {
    for (const [id, def] of Object.entries(ZONE_DEFS)) {
      const grid = generateTilemap(def);
      const state: ZoneState = {
        def, grid, tick: 0,
        entities: new Map(),
        events: [],
        chat: [],
      };
      this.zones.set(id as ZoneId, state);
      this.spawnZoneNpcs(state);
      this.spawnZoneMonsters(state);
      this.spawnZoneAgents(state);
    }
  }

  private spawnZoneNpcs(z: ZoneState) {
    const { spawnX: sx, spawnY: sy } = z.def;
    const npc: NpcEntity = {
      id: `npc_${z.def.id}_warp`, type: "npc", zone: z.def.id,
      x: sx + 3, y: sy, px: (sx + 3) * 32, py: sy * 32,
      dir: "down", hp: 999, maxHp: 999, name: "Warp Mage",
      isDead: false, deathAt: 0, role: "warp",
    };
    z.entities.set(npc.id, npc);

    const shop: NpcEntity = {
      id: `npc_${z.def.id}_shop`, type: "npc", zone: z.def.id,
      x: sx - 3, y: sy, px: (sx - 3) * 32, py: sy * 32,
      dir: "down", hp: 999, maxHp: 999, name: "Merchant",
      isDead: false, deathAt: 0, role: "shop",
    };
    z.entities.set(shop.id, shop);
  }

  private spawnZoneMonsters(z: ZoneState) {
    const { width: W, height: H, monsters } = z.def;
    const count = Math.floor(W * H * 0.012); // ~1.2% tile density
    for (let i = 0; i < count; i++) {
      const kind = monsters[Math.floor(Math.random() * monsters.length)] as MonsterKind;
      this.spawnMonster(z, kind);
    }
  }

  private spawnMonster(z: ZoneState, kind: MonsterKind, fx?: number, fy?: number): MonsterEntity {
    const def = MONSTER_DEFS[kind];
    const { width: W, height: H } = z.def;
    let mx = fx ?? randInt(2, W - 3);
    let my = fy ?? randInt(2, H - 3);
    // Find walkable spawn
    for (let attempt = 0; attempt < 20; attempt++) {
      if (isWalkable(z.grid, mx, my)) break;
      mx = randInt(2, W - 3); my = randInt(2, H - 3);
    }
    const mon: MonsterEntity = {
      id: `mon_${uid()}`, type: "monster", zone: z.def.id,
      x: mx, y: my, px: mx * 32, py: my * 32,
      dir: "down", hp: def.maxHp, maxHp: def.maxHp,
      name: def.name, isDead: false, deathAt: 0,
      kind, aiState: "wander", targetId: null,
      aggroRange: def.aggroRange, fleeHpPct: def.fleeHpPct,
      attackDamage: def.damage, attackRange: 1.5,
      attackCoolMs: 1400, lastAttackAt: 0,
      moveSpeed: def.speed, destX: mx, destY: my,
      xpReward: def.xpReward, goldReward: def.goldReward,
      respawnDelaySec: def.respawnDelaySec,
      spawnX: mx, spawnY: my, wanderTimer: Math.random() * 3000,
    };
    z.entities.set(mon.id, mon);
    return mon;
  }

  private spawnZoneAgents(z: ZoneState) {
    const personalities: AgentPersonality[] = ["warrior", "mage", "rogue", "healer"];
    const agentNames = [
      ["Aria","Kael","Lyra","Drax","Zeph","Nova","Cael","Vex"],
      ["Mira","Thane","Rynn","Sora","Ash","Dusk","Blaze","Frost"],
    ].flat();
    const count = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const p = personalities[i % personalities.length];
      const name = agentNames[Math.floor(Math.random() * agentNames.length)];
      this.createAgent(z, p, name);
    }
  }

  private createAgent(z: ZoneState, personality: AgentPersonality, name: string): AgentEntity {
    const { spawnX: sx, spawnY: sy } = z.def;
    const mx = sx + randInt(-4, 4);
    const my = sy + randInt(-4, 4);
    const level = 1 + Math.floor(Math.random() * 10);
    const agent: AgentEntity = {
      id: `agent_${uid()}`, type: "agent", zone: z.def.id,
      x: mx, y: my, px: mx * 32, py: my * 32,
      dir: "down", hp: 80 + level * 20, maxHp: 100 + level * 20,
      name, isDead: false, deathAt: 0,
      personality, aiState: "wander", targetId: null,
      homeX: sx, homeY: sy,
      xp: 0, xpNext: level * 100, level,
      gold: 0,
      attackDamage: 15 + level * 5,
      attackRange: personality === "mage" ? 3 : 1.5,
      attackCoolMs: 1200,
      lastAttackAt: 0,
      moveSpeed: personality === "rogue" ? 2.4 : 1.8,
      destX: mx, destY: my,
      kills: 0,
      wanderTimer: Math.random() * 4000,
    };
    z.entities.set(agent.id, agent);
    return agent;
  }

  // ── Player management ───────────────────────────────────────────────────
  addPlayer(fid: number, name: string, zone: ZoneId = "crystal_haven"): PlayerEntity {
    const z = this.zones.get(zone)!;
    const { spawnX, spawnY } = z.def;
    const existing = [...z.entities.values()].find(
      e => e.type === "player" && (e as PlayerEntity).fid === fid
    ) as PlayerEntity | undefined;
    if (existing) return existing;

    const player: PlayerEntity = {
      id: `player_${fid}`, type: "player", zone,
      x: spawnX, y: spawnY, px: spawnX * 32, py: spawnY * 32,
      dir: "down", hp: 150, maxHp: 150,
      name, isDead: false, deathAt: 0,
      fid, xp: 0, xpNext: 100, level: 1, gold: 0,
      attackDamage: 25, attackRange: 1.5,
      attackCoolMs: 800, lastAttackAt: 0,
      moveSpeed: 2.2,
      destX: spawnX, destY: spawnY,
      kills: 0,
    };
    z.entities.set(player.id, player);
    return player;
  }

  removePlayer(playerId: string) {
    for (const z of this.zones.values()) {
      z.entities.delete(playerId);
    }
  }

  getPlayer(playerId: string): PlayerEntity | null {
    for (const z of this.zones.values()) {
      const e = z.entities.get(playerId);
      if (e?.type === "player") return e as PlayerEntity;
    }
    return null;
  }

  // ── Input queue ─────────────────────────────────────────────────────────
  queueMove(playerId: string, destX: number, destY: number) {
    this.pendingMoves.set(playerId, { destX, destY });
  }

  queueAttack(playerId: string, targetId: string) {
    this.pendingAttacks.set(playerId, targetId);
  }

  // ── Snapshot ────────────────────────────────────────────────────────────
  getSnapshot(zone: ZoneId, viewerX: number, viewerY: number): ZoneSnapshot {
    const z = this.zones.get(zone)!;
    const nearby = [...z.entities.values()].filter(e =>
      dist(e.x, e.y, viewerX, viewerY) <= INTEREST_RADIUS * 2
    );
    const snap: ZoneSnapshot = {
      tick: z.tick,
      zoneId: zone,
      entities: nearby,
      events: z.events.slice(-20),
      chat: z.chat.slice(-10),
    };
    return snap;
  }

  getZoneTilemap(zone: ZoneId): TileGrid {
    return this.zones.get(zone)!.grid;
  }

  // ── Tick loop ────────────────────────────────────────────────────────────
  private startTickLoop() {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => this.tick(), TICK_MS);
  }

  private tick() {
    const now = Date.now();
    for (const z of this.zones.values()) {
      z.tick++;
      z.events = []; // reset per-tick events

      // Apply player inputs
      this.applyMoves(z, now);
      this.applyAttacks(z, now);

      // Update entities
      for (const entity of z.entities.values()) {
        if (entity.type === "monster") this.tickMonster(z, entity as MonsterEntity, now);
        else if (entity.type === "agent") this.tickAgent(z, entity as AgentEntity, now);
        else if (entity.type === "player") this.tickPlayer(z, entity as PlayerEntity, now);
      }

      // Handle respawns
      this.tickRespawns(z, now);
    }

    // Clear processed inputs
    this.pendingMoves.clear();
    this.pendingAttacks.clear();
  }

  // ── Player tick ──────────────────────────────────────────────────────────
  private tickPlayer(z: ZoneState, p: PlayerEntity, now: number) {
    if (p.isDead) return;
    this.moveEntityTowardDest(z, p, now);
  }

  // ── Apply queued moves ───────────────────────────────────────────────────
  private applyMoves(z: ZoneState, _now: number) {
    for (const [pid, move] of this.pendingMoves) {
      const e = z.entities.get(pid);
      if (!e || e.type !== "player") continue;
      const p = e as PlayerEntity;
      if (p.isDead) continue;
      if (isWalkable(z.grid, move.destX, move.destY)) {
        p.destX = clamp(move.destX, 0, z.def.width  - 1);
        p.destY = clamp(move.destY, 0, z.def.height - 1);
      }
    }
  }

  // ── Apply queued attacks ─────────────────────────────────────────────────
  private applyAttacks(z: ZoneState, now: number) {
    for (const [attackerId, targetId] of this.pendingAttacks) {
      const attacker = z.entities.get(attackerId);
      const target   = z.entities.get(targetId);
      if (!attacker || !target) continue;
      if (attacker.isDead || target.isDead) continue;
      if (attacker.type !== "player") continue;
      const p = attacker as PlayerEntity;
      if (now - p.lastAttackAt < p.attackCoolMs) continue;
      if (dist(p.x, p.y, target.x, target.y) > p.attackRange + 0.5) continue;

      this.resolveAttack(z, p, target, now);
    }
  }

  // ── Movement helper ──────────────────────────────────────────────────────
  private moveEntityTowardDest(
    z: ZoneState,
    e: PlayerEntity | AgentEntity | MonsterEntity,
    now: number,
  ) {
    if (e.x === e.destX && e.y === e.destY) return;
    const speed = e.moveSpeed;
    const dtSec = TICK_MS / 1000;
    const stepPx = speed * 32 * dtSec;

    const tx = e.destX * 32 + 16;
    const ty = e.destY * 32 + 16;
    const dx = tx - e.px;
    const dy = ty - e.py;
    const d  = Math.sqrt(dx * dx + dy * dy);

    if (d < stepPx + 2) {
      e.px = tx; e.py = ty;
      e.x  = e.destX; e.y = e.destY;
    } else {
      e.px += (dx / d) * stepPx;
      e.py += (dy / d) * stepPx;
      e.x  = Math.round(e.px / 32);
      e.y  = Math.round(e.py / 32);
      // Update facing
      const adx = Math.abs(dx); const ady = Math.abs(dy);
      if (adx > ady) e.dir = dx > 0 ? "right" : "left";
      else           e.dir = dy > 0 ? "down"  : "up";
    }
  }

  // ── Monster AI ────────────────────────────────────────────────────────────
  private tickMonster(z: ZoneState, m: MonsterEntity, now: number) {
    if (m.isDead) return;

    // Flee if low hp
    if (m.hp / m.maxHp < m.fleeHpPct) {
      m.aiState = "flee";
      m.targetId = null;
    }

    // State machine
    switch (m.aiState) {
      case "wander": {
        // Aggro check
        const target = this.findNearestHostile(z, m, m.aggroRange);
        if (target) { m.targetId = target.id; m.aiState = "chase"; break; }
        // Wander
        m.wanderTimer -= TICK_MS;
        if (m.wanderTimer <= 0) {
          m.wanderTimer = 1500 + Math.random() * 3000;
          const nx = clamp(m.spawnX + randInt(-4, 4), 1, z.def.width  - 2);
          const ny = clamp(m.spawnY + randInt(-4, 4), 1, z.def.height - 2);
          if (isWalkable(z.grid, nx, ny)) { m.destX = nx; m.destY = ny; }
        }
        this.moveEntityTowardDest(z, m, now);
        break;
      }
      case "chase": {
        const t = m.targetId ? z.entities.get(m.targetId) : null;
        if (!t || t.isDead || dist(m.x, m.y, t.x, t.y) > m.aggroRange * 1.5) {
          m.aiState = "wander"; m.targetId = null; break;
        }
        if (dist(m.x, m.y, t.x, t.y) <= m.attackRange) {
          m.aiState = "attack";
        } else {
          m.destX = t.x; m.destY = t.y;
          this.moveEntityTowardDest(z, m, now);
        }
        break;
      }
      case "attack": {
        const t = m.targetId ? z.entities.get(m.targetId) : null;
        if (!t || t.isDead) { m.aiState = "wander"; m.targetId = null; break; }
        if (dist(m.x, m.y, t.x, t.y) > m.attackRange + 0.5) {
          m.aiState = "chase"; break;
        }
        if (now - m.lastAttackAt >= m.attackCoolMs) {
          this.resolveAttack(z, m, t, now);
        }
        break;
      }
      case "flee": {
        // Run away from nearest threat
        const threat = this.findNearestHostile(z, m, m.aggroRange * 2);
        if (!threat || m.hp / m.maxHp > m.fleeHpPct + 0.1) {
          m.aiState = "wander"; break;
        }
        const fx = clamp(m.x + (m.x - threat.x), 1, z.def.width  - 2);
        const fy = clamp(m.y + (m.y - threat.y), 1, z.def.height - 2);
        if (isWalkable(z.grid, fx, fy)) { m.destX = fx; m.destY = fy; }
        this.moveEntityTowardDest(z, m, now);
        break;
      }
    }
  }

  // ── Agent AI ──────────────────────────────────────────────────────────────
  private tickAgent(z: ZoneState, a: AgentEntity, now: number) {
    if (a.isDead) return;

    switch (a.aiState) {
      case "wander":
      case "farm": {
        // Seek nearest monster
        const range = a.personality === "healer" ? 2 : 8;
        const target = this.findNearestMonster(z, a, range);
        if (target) { a.targetId = target.id; a.aiState = "chase"; break; }
        // Wander around home
        a.wanderTimer -= TICK_MS;
        if (a.wanderTimer <= 0) {
          a.wanderTimer = 2000 + Math.random() * 4000;
          const nx = clamp(a.homeX + randInt(-6, 6), 1, z.def.width  - 2);
          const ny = clamp(a.homeY + randInt(-6, 6), 1, z.def.height - 2);
          if (isWalkable(z.grid, nx, ny)) { a.destX = nx; a.destY = ny; }
        }
        this.moveEntityTowardDest(z, a, now);
        break;
      }
      case "chase": {
        const t = a.targetId ? z.entities.get(a.targetId) : null;
        if (!t || t.isDead) { a.aiState = "farm"; a.targetId = null; break; }
        if (dist(a.x, a.y, t.x, t.y) <= a.attackRange) {
          a.aiState = "attack";
        } else {
          a.destX = t.x; a.destY = t.y;
          this.moveEntityTowardDest(z, a, now);
        }
        break;
      }
      case "attack": {
        const t = a.targetId ? z.entities.get(a.targetId) : null;
        if (!t || t.isDead) { a.aiState = "farm"; a.targetId = null; break; }
        if (dist(a.x, a.y, t.x, t.y) > a.attackRange + 0.5) {
          a.aiState = "chase"; break;
        }
        if (now - a.lastAttackAt >= a.attackCoolMs) {
          this.resolveAttack(z, a, t, now);
        }
        break;
      }
      case "flee":
      case "return": {
        a.destX = a.homeX; a.destY = a.homeY;
        if (a.x === a.homeX && a.y === a.homeY) { a.aiState = "wander"; break; }
        this.moveEntityTowardDest(z, a, now);
        break;
      }
    }

    // Heal self if low HP
    if (a.hp / a.maxHp < 0.25 && a.aiState !== "flee") {
      a.aiState = "flee";
      a.targetId = null;
    }
  }

  // ── Combat resolution ─────────────────────────────────────────────────────
  private resolveAttack(
    z: ZoneState,
    attacker: PlayerEntity | AgentEntity | MonsterEntity,
    target: AnyEntity,
    now: number,
  ) {
    if (target.type === "npc") return;
    const baseDmg = (attacker as any).attackDamage ?? 10;
    const isCrit  = Math.random() < 0.12;
    const damage  = Math.floor(baseDmg * (isCrit ? 2.2 : 1) * (0.85 + Math.random() * 0.3));

    target.hp = Math.max(0, target.hp - damage);

    if (attacker.type === "monster") {
      attacker.lastAttackAt = now;
    } else {
      (attacker as PlayerEntity | AgentEntity).lastAttackAt = now;
    }

    // Update facing
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    if (Math.abs(dx) > Math.abs(dy)) attacker.dir = dx > 0 ? "right" : "left";
    else attacker.dir = dy > 0 ? "down" : "up";

    z.events.push({
      attackerId: attacker.id,
      targetId: target.id,
      damage,
      isCrit,
      timestamp: now,
    });

    if (target.hp <= 0 && !target.isDead) {
      target.isDead = true;
      target.deathAt = now;

      // Reward attacker
      if (target.type === "monster") {
        const mon = target as MonsterEntity;
        if (attacker.type === "player" || attacker.type === "agent") {
          const p = attacker as PlayerEntity | AgentEntity;
          p.xp   += mon.xpReward;
          p.gold += mon.goldReward;
          p.kills = (p.kills ?? 0) + 1;
          // Level up
          while (p.xp >= p.xpNext) {
            p.xp    -= p.xpNext;
            p.level += 1;
            p.xpNext = p.level * 100;
            p.maxHp  = 100 + p.level * 20;
            p.hp     = p.maxHp;
            p.attackDamage += 5;
          }
        }
      }

      if (target.type === "player") {
        // Death penalty: lose 10% gold
        const p = target as PlayerEntity;
        p.gold = Math.max(0, Math.floor(p.gold * 0.9));
      }
    }
  }

  // ── Respawn ───────────────────────────────────────────────────────────────
  private tickRespawns(z: ZoneState, now: number) {
    const toRespawn: string[] = [];
    for (const [id, e] of z.entities) {
      if (!e.isDead) continue;
      if (e.type === "monster") {
        const m = e as MonsterEntity;
        if (now - m.deathAt > m.respawnDelaySec * 1000) {
          toRespawn.push(id);
          this.spawnMonster(z, m.kind, m.spawnX, m.spawnY);
        }
      } else if (e.type === "player" || e.type === "agent") {
        if (now - e.deathAt > 5000) {
          e.isDead = false;
          e.deathAt = 0;
          e.hp = e.maxHp;
          e.x = z.def.spawnX; e.y = z.def.spawnY;
          e.px = e.x * 32; e.py = e.y * 32;
          (e as any).destX = e.x; (e as any).destY = e.y;
          if (e.type === "agent") (e as AgentEntity).aiState = "wander";
        }
      }
    }
    for (const id of toRespawn) z.entities.delete(id);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private findNearestHostile(z: ZoneState, e: AnyEntity, range: number): AnyEntity | null {
    let nearest: AnyEntity | null = null;
    let nearDist = Infinity;
    for (const other of z.entities.values()) {
      if (other.id === e.id || other.isDead) continue;
      if (other.type === "player" || other.type === "agent") {
        const d = dist(e.x, e.y, other.x, other.y);
        if (d <= range && d < nearDist) { nearest = other; nearDist = d; }
      }
    }
    return nearest;
  }

  private findNearestMonster(z: ZoneState, e: AnyEntity, range: number): MonsterEntity | null {
    let nearest: MonsterEntity | null = null;
    let nearDist = Infinity;
    for (const other of z.entities.values()) {
      if (other.type !== "monster" || other.isDead) continue;
      const d = dist(e.x, e.y, other.x, other.y);
      if (d <= range && d < nearDist) {
        nearest = other as MonsterEntity;
        nearDist = d;
      }
    }
    return nearest;
  }
}

// ─── Global singleton (Next.js hot-reload safe) ───────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __mmoWorld: GameWorld | undefined;
}

export function getWorld(): GameWorld {
  if (!global.__mmoWorld) {
    global.__mmoWorld = new GameWorld();
  }
  return global.__mmoWorld;
}

export type { TileGrid };

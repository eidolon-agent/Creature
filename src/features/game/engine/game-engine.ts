// ─── CreatureQuest Game Engine ──────────────────────────────────────────────
// Pure TypeScript — no DOM, no PixiJS. Can run server-side or in a worker.

export type MapId = "town" | "forest" | "dungeon";
export type EntityType = "player" | "agent" | "enemy" | "npc";
export type AgentPersonality = "farmer" | "aggressive" | "looter";
export type AgentAIState = "IDLE" | "MOVE_TO_NPC" | "MOVE_TO_ZONE" | "HUNT" | "RECALL" | "LOOT";

// ─── Map definitions ──────────────────────────────────────────────────────

export interface MapDef {
  id: MapId;
  name: string;
  pvp: boolean;
  color: number;       // tint hex for PixiJS background
  width: number;
  height: number;
  bgColor: string;     // CSS for HUD label
  label: string;
}

export const MAPS: Record<MapId, MapDef> = {
  town: {
    id: "town", name: "Crystal Haven", pvp: false, color: 0x1e3a2f,
    width: 1200, height: 1200, bgColor: "#166534", label: "🏘️ CRYSTAL HAVEN",
  },
  forest: {
    id: "forest", name: "Whispering Woods", pvp: false, color: 0x14532d,
    width: 2000, height: 2000, bgColor: "#15803d", label: "🌲 WHISPERING WOODS",
  },
  dungeon: {
    id: "dungeon", name: "Shadowfall", pvp: true, color: 0x3b0764,
    width: 1600, height: 1600, bgColor: "#7e22ce", label: "💀 SHADOWFALL",
  },
};

// ─── Portals ──────────────────────────────────────────────────────────────

export interface Portal {
  from: MapId;
  to: MapId;
  x: number;
  y: number;
  label: string;
  color: number;
}

export const PORTALS: Portal[] = [
  { from: "town",    to: "forest",  x: 600,  y: 1100, label: "→ Whispering Woods",  color: 0x22c55e },
  { from: "forest",  to: "town",    x: 1000, y: 100,  label: "→ Crystal Haven",    color: 0x94a3b8 },
  { from: "forest",  to: "dungeon", x: 1000, y: 1900, label: "→ Shadowfall", color: 0xb91c1c },
  { from: "dungeon", to: "forest",  x: 800,  y: 100,  label: "→ Whispering Woods",  color: 0x22c55e },
];

// ─── NPC definitions ──────────────────────────────────────────────────────

export interface NpcDef {
  id: string;
  map: MapId;
  x: number;
  y: number;
  name: string;
  type: "quest" | "merchant";
  questRequired?: number;
}

export const NPC_DEFS: NpcDef[] = [
  { id: "guildmaster", map: "town", x: 600, y: 500, name: "Guild Master", type: "quest", questRequired: 5 },
  { id: "merchant",    map: "town", x: 380, y: 600, name: "Merchant",     type: "merchant" },
];

// ─── Entity base ──────────────────────────────────────────────────────────

export interface Vec2 { x: number; y: number; }

export interface Entity {
  id: string;
  type: EntityType;
  map: MapId;
  x: number;
  y: number;
  destX: number;
  destY: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldownMs: number;
  pvpCooldownMs: number;
  name: string;
}

export interface PlayerEntity extends Entity {
  type: "player";
  xp: number;
  level: number;
  gold: number;
  potions: number;
  quest: Quest | null;
  isDead: boolean;
}

export interface AgentEntity extends Entity {
  type: "agent";
  personality: AgentPersonality;
  aiState: AgentAIState;
  quest: Quest | null;
  gold: number;
  emoji: string;
}

export interface EnemyEntity extends Entity {
  type: "enemy";
  targetId: string | null;
  emoji: string;
  xpReward: number;
  goldReward: number;
}

export interface NpcEntity extends Entity {
  type: "npc";
  npcId: string;
  emoji: string;
}

export interface Quest {
  required: number;
  progress: number;
  completed: boolean;
}

export interface LootDrop {
  id: string;
  map: MapId;
  x: number;
  y: number;
  amount: number;
  expiresAt: number;
}

// ─── Combat event (for log) ───────────────────────────────────────────────

export interface GameEvent {
  type: "hit" | "kill" | "levelup" | "loot" | "portal" | "pvp_warning" | "quest_complete";
  msg: string;
  isCrit?: boolean;
  damage?: number;
}

// ─── Game State ───────────────────────────────────────────────────────────

export class GameEngine {
  player: PlayerEntity | null = null;
  agents: Map<string, AgentEntity> = new Map();
  enemies: Map<string, EnemyEntity> = new Map();
  npcs: Map<string, NpcEntity> = new Map();
  loot: Map<string, LootDrop> = new Map();
  events: GameEvent[] = [];        // flush each frame

  private _idCounter = 0;
  private genId(prefix: string) { return `${prefix}_${++this._idCounter}`; }

  // ─── Init ──────────────────────────────────────────────────────────────

  init(playerName: string) {
    // Spawn player
    this.player = {
      id: "player",
      type: "player",
      name: playerName,
      map: "town",
      x: 600, y: 800,
      destX: 600, destY: 800,
      hp: 100, maxHp: 100,
      speed: 160, damage: 20,
      attackCooldownMs: 0, pvpCooldownMs: 0,
      xp: 0, level: 1, gold: 0, potions: 3,
      quest: null, isDead: false,
    };

    // Spawn NPCs
    for (const def of NPC_DEFS) {
      const npc: NpcEntity = {
        id: def.id, type: "npc", npcId: def.id,
        name: def.name, map: def.map,
        x: def.x, y: def.y,
        destX: def.x, destY: def.y,
        hp: 999, maxHp: 999,
        speed: 0, damage: 0,
        attackCooldownMs: 0, pvpCooldownMs: 0,
        emoji: def.type === "quest" ? "📋" : "🛒",
      };
      this.npcs.set(npc.id, npc);
    }

    // Spawn 5 AI agents
    const personalities: AgentPersonality[] = ["farmer", "farmer", "aggressive", "aggressive", "looter"];
    const agentEmojis = ["🧙", "⚔️", "🏹", "🛡️", "🪄"];
    const agentNames = ["Aria", "Drax", "Lyra", "Khor", "Zeph"];
    for (let i = 0; i < 5; i++) {
      const agent: AgentEntity = {
        id: this.genId("agent"),
        type: "agent",
        name: agentNames[i],
        personality: personalities[i],
        map: "town",
        x: 500 + Math.random() * 200,
        y: 700 + Math.random() * 200,
        destX: 500, destY: 700,
        hp: 120, maxHp: 120,
        speed: 110 + Math.random() * 30,
        damage: 18,
        attackCooldownMs: 0, pvpCooldownMs: 0,
        aiState: "IDLE",
        quest: null,
        gold: 0,
        emoji: agentEmojis[i],
      };
      this.agents.set(agent.id, agent);
    }

    // Initial enemies
    for (let i = 0; i < 5; i++) this.spawnEnemy("forest");
    for (let i = 0; i < 3; i++) this.spawnEnemy("dungeon");
  }

  // ─── Enemy spawning ────────────────────────────────────────────────────

  spawnEnemy(mapId: MapId) {
    if (mapId === "town") return;
    const map = MAPS[mapId];
    const isDungeon = mapId === "dungeon";
    const id = this.genId("enemy");
    const enemy: EnemyEntity = {
      id, type: "enemy",
      name: isDungeon ? "Void Drake" : "Slime",
      map: mapId,
      x: 100 + Math.random() * (map.width - 200),
      y: 100 + Math.random() * (map.height - 200),
      destX: 0, destY: 0,
      hp: isDungeon ? 120 : 50,
      maxHp: isDungeon ? 120 : 50,
      speed: isDungeon ? 65 : 40,
      damage: isDungeon ? 18 : 6,
      attackCooldownMs: 0, pvpCooldownMs: 0,
      targetId: null,
      emoji: isDungeon ? "🐲" : "🟢",
      xpReward: isDungeon ? 40 : 20,
      goldReward: isDungeon ? 30 : 10,
    };
    enemy.destX = enemy.x;
    enemy.destY = enemy.y;
    this.enemies.set(id, enemy);
  }

  // ─── Player controls ───────────────────────────────────────────────────

  movePlayerTo(wx: number, wy: number) {
    if (!this.player || this.player.isDead) return;
    const map = MAPS[this.player.map];
    this.player.destX = Math.max(30, Math.min(map.width - 30, wx));
    this.player.destY = Math.max(30, Math.min(map.height - 30, wy));
  }

  usePotion() {
    if (!this.player || this.player.potions <= 0) return;
    this.player.potions--;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 50);
    this.pushEvent({ type: "loot", msg: "Used potion! +50 HP" });
  }

  // ─── Tick ──────────────────────────────────────────────────────────────

  tick(deltaMs: number) {
    this.events = [];
    const dt = Math.min(deltaMs, 100); // cap at 100ms to avoid spiral

    // Cool down timers
    const all = this.allCombatants();
    for (const e of all) {
      if (e.attackCooldownMs > 0) e.attackCooldownMs -= dt;
      if (e.pvpCooldownMs > 0)    e.pvpCooldownMs -= dt;
    }

    this.tickMovement(dt);
    this.tickEnemyAI(dt);
    this.tickAgentAI();
    this.tickCombat();
    this.tickPortals();
    this.tickLoot();
    this.tickEnemyRespawn();
    this.tickLootExpiry();
  }

  // ─── Movement ─────────────────────────────────────────────────────────

  private moveEntity(e: Entity, dt: number) {
    const dx = e.destX - e.x;
    const dy = e.destY - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) return;
    const step = e.speed * (dt / 1000);
    const ratio = Math.min(step / dist, 1);
    e.x += dx * ratio;
    e.y += dy * ratio;
  }

  private tickMovement(dt: number) {
    if (this.player) this.moveEntity(this.player, dt);
    for (const a of this.agents.values()) this.moveEntity(a, dt);
    for (const en of this.enemies.values()) this.moveEntity(en, dt);
  }

  // ─── Enemy AI ─────────────────────────────────────────────────────────

  private tickEnemyAI(_dt: number) {
    for (const enemy of this.enemies.values()) {
      // Find nearest target
      let nearest: Entity | null = null;
      let minDist = 280; // aggro range

      const targets = [
        ...(this.player && this.player.map === enemy.map ? [this.player as Entity] : []),
        ...Array.from(this.agents.values()).filter(a => a.map === enemy.map),
      ];

      for (const t of targets) {
        const d = dist(enemy, t);
        if (d < minDist) { minDist = d; nearest = t; }
      }

      if (nearest) {
        enemy.destX = nearest.x;
        enemy.destY = nearest.y;
        enemy.targetId = nearest.id;
      } else {
        enemy.targetId = null;
        // Random roam every so often
        if (Math.random() < 0.015) {
          const map = MAPS[enemy.map];
          enemy.destX = clamp(enemy.x + (Math.random() - 0.5) * 300, 50, map.width - 50);
          enemy.destY = clamp(enemy.y + (Math.random() - 0.5) * 300, 50, map.height - 50);
        }
      }
    }
  }

  // ─── Agent AI (runs each tick but with its own state machine) ─────────

  private tickAgentAI() {
    for (const agent of this.agents.values()) {
      // Heal in town
      if (agent.map === "town") {
        agent.hp = Math.min(agent.maxHp, agent.hp + 2);
      }

      // Survival: low HP → recall
      if (agent.hp < agent.maxHp * 0.25) {
        const portal = PORTALS.find(p => p.from === agent.map && p.to === "town");
        if (portal) { agent.destX = portal.x; agent.destY = portal.y; }
        agent.aiState = "RECALL";
        continue;
      }

      // Town logic
      if (agent.map === "town") {
        agent.aiState = "IDLE";
        const gm = this.npcs.get("guildmaster")!;

        if (!agent.quest) {
          // Walk to guild master for a quest
          if (dist(agent, gm) < 60) {
            agent.quest = { required: 5, progress: 0, completed: false };
          } else {
            agent.destX = gm.x; agent.destY = gm.y;
            agent.aiState = "MOVE_TO_NPC";
          }
          continue;
        }

        if (agent.quest.completed) {
          // Turn in quest
          if (dist(agent, gm) < 60) {
            agent.quest = null;
            agent.gold += 100;
          } else {
            agent.destX = gm.x; agent.destY = gm.y;
            agent.aiState = "MOVE_TO_NPC";
          }
          continue;
        }

        // Head to farming zone
        const targetMap = agent.personality === "aggressive" ? "dungeon" : "forest";
        const portal = PORTALS.find(p => p.from === "town" && p.to === "forest");
        if (portal) { agent.destX = portal.x; agent.destY = portal.y; }
        agent.aiState = "MOVE_TO_ZONE";
        continue;
      }

      // Looter: pick up nearby loot first
      if (agent.personality === "looter") {
        const nearLoot = Array.from(this.loot.values()).find(
          l => l.map === agent.map && dist(agent, l) < 200
        );
        if (nearLoot) {
          agent.destX = nearLoot.x; agent.destY = nearLoot.y;
          agent.aiState = "LOOT";
          continue;
        }
      }

      // Aggressive in dungeon: hunt players
      if (agent.personality === "aggressive" && agent.map === "dungeon" && MAPS.dungeon.pvp) {
        if (this.player && this.player.map === "dungeon" && this.player.pvpCooldownMs <= 0) {
          agent.destX = this.player.x;
          agent.destY = this.player.y;
          agent.aiState = "HUNT";
          continue;
        }
      }

      // Hunt nearest enemy
      let nearest: EnemyEntity | null = null;
      let minD = 9999;
      for (const en of this.enemies.values()) {
        if (en.map !== agent.map) continue;
        const d = dist(agent, en);
        if (d < minD) { minD = d; nearest = en; }
      }

      if (nearest) {
        agent.destX = nearest.x;
        agent.destY = nearest.y;
        agent.aiState = "HUNT";
      } else {
        // Wander or move to dungeon portal if aggressive
        if (agent.personality === "aggressive" && agent.map === "forest") {
          const portal = PORTALS.find(p => p.from === "forest" && p.to === "dungeon");
          if (portal) { agent.destX = portal.x; agent.destY = portal.y; }
        } else {
          // Random wander
          if (Math.random() < 0.02) {
            const map = MAPS[agent.map];
            agent.destX = clamp(agent.x + (Math.random() - 0.5) * 400, 50, map.width - 50);
            agent.destY = clamp(agent.y + (Math.random() - 0.5) * 400, 50, map.height - 50);
          }
        }
        agent.aiState = "IDLE";
      }
    }
  }

  // ─── Combat ───────────────────────────────────────────────────────────

  private tickCombat() {
    const combatants = this.allCombatants();
    const ATTACK_RANGE = 52;

    for (let i = 0; i < combatants.length; i++) {
      const a = combatants[i];
      if (a.attackCooldownMs > 0 || a.hp <= 0) continue;

      for (let j = 0; j < combatants.length; j++) {
        if (i === j) continue;
        const b = combatants[j];
        if (b.hp <= 0) continue;
        if (a.map !== b.map) continue;
        if (dist(a, b) > ATTACK_RANGE) continue;

        const canAttack = this.resolveCanAttack(a, b);
        if (!canAttack) continue;

        const isCrit = Math.random() < 0.12;
        const dmg = Math.floor(a.damage * (isCrit ? 2 : 1) * (0.85 + Math.random() * 0.3));
        b.hp -= dmg;
        a.attackCooldownMs = 900;

        this.pushEvent({
          type: "hit",
          msg: `${a.name} hit ${b.name} for ${dmg}`,
          isCrit, damage: dmg,
        });

        if (b.hp <= 0) this.resolveDeath(b, a);
        break; // one attack target per frame
      }
    }
  }

  private resolveCanAttack(attacker: Entity, target: Entity): boolean {
    if (attacker.type === "npc" || target.type === "npc") return false;

    // Enemy attacks players + agents
    if (attacker.type === "enemy") {
      return target.type === "player" || target.type === "agent";
    }
    // Player/agent attacks enemies always
    if (target.type === "enemy") return true;

    // Player vs player / player vs agent — only in PvP map
    if (MAPS[attacker.map].pvp) {
      const ac = attacker as Entity & { pvpCooldownMs: number };
      const bc = target as Entity & { pvpCooldownMs: number };
      return ac.pvpCooldownMs <= 0 && bc.pvpCooldownMs <= 0;
    }

    return false;
  }

  private resolveDeath(victim: Entity, killer: Entity) {
    if (victim.type === "enemy") {
      const en = victim as EnemyEntity;
      // Drop loot
      const id = this.genId("loot");
      this.loot.set(id, {
        id, map: en.map,
        x: en.x, y: en.y,
        amount: en.goldReward,
        expiresAt: Date.now() + 12000,
      });
      this.enemies.delete(en.id);

      // XP and quest
      if (killer.type === "player" && this.player) {
        this.player.xp += (victim as EnemyEntity).xpReward;
        if (this.player.quest) this.player.quest.progress++;
        if (this.player.xp >= this.player.level * 100) {
          this.player.level++;
          this.player.xp = 0;
          this.player.maxHp += 20;
          this.player.hp = this.player.maxHp;
          this.player.damage += 5;
          this.pushEvent({ type: "levelup", msg: `Level ${this.player.level}!` });
        }
        if (this.player.quest && this.player.quest.progress >= this.player.quest.required && !this.player.quest.completed) {
          this.player.quest.completed = true;
          this.pushEvent({ type: "quest_complete", msg: "Quest complete! Return to Guild Master." });
        }
      }
      if (killer.type === "agent") {
        const ag = killer as AgentEntity;
        if (ag.quest) {
          ag.quest.progress++;
          if (ag.quest.progress >= ag.quest.required) ag.quest.completed = true;
        }
      }

      this.pushEvent({ type: "kill", msg: `${killer.name} slew ${victim.name}` });
    } else {
      // Player/agent death → respawn in town
      victim.map = "town";
      victim.x = 600; victim.y = 800;
      victim.destX = 600; victim.destY = 800;
      victim.hp = victim.maxHp;

      if (victim.type === "player" && this.player) {
        this.player.gold = Math.floor(this.player.gold * 0.9);
        this.pushEvent({ type: "hit", msg: "You died! Respawning in Town..." });
      }
    }
  }

  // ─── Portals ──────────────────────────────────────────────────────────

  private tickPortals() {
    const teleport = (e: Entity) => {
      if (e.type === "enemy") return;
      for (const portal of PORTALS) {
        if (e.map !== portal.from) continue;
        if (dist(e, portal) > 48) continue;

        e.map = portal.to;
        const dest = PORTALS.find(p => p.from === portal.to && p.to === portal.from);
        if (dest) { e.x = dest.x; e.y = dest.y + 120; }
        else      { e.x = 600;   e.y = 800; }
        e.destX = e.x; e.destY = e.y;

        if (MAPS[portal.to].pvp) {
          e.pvpCooldownMs = 3000;
          if (e.type === "player") {
            this.pushEvent({ type: "pvp_warning", msg: "⚔️ PvP Zone! 3-second grace period." });
          }
        }
        break;
      }
    };

    if (this.player) teleport(this.player);
    for (const a of this.agents.values()) teleport(a);
  }

  // ─── Loot pickup ──────────────────────────────────────────────────────

  private tickLoot() {
    const pickUp = (e: Entity & { gold: number }) => {
      for (const [id, l] of this.loot.entries()) {
        if (l.map !== e.map) continue;
        if (dist(e, l) > 44) continue;
        e.gold += l.amount;
        this.loot.delete(id);
        if (e.type === "player") {
          this.pushEvent({ type: "loot", msg: `+${l.amount} gold` });
        }
      }
    };
    if (this.player) pickUp(this.player as any);
    for (const a of this.agents.values()) pickUp(a as any);
  }

  private tickLootExpiry() {
    const now = Date.now();
    for (const [id, l] of this.loot.entries()) {
      if (now > l.expiresAt) this.loot.delete(id);
    }
  }

  // ─── Enemy respawn ────────────────────────────────────────────────────

  private tickEnemyRespawn() {
    const forestCount  = [...this.enemies.values()].filter(e => e.map === "forest").length;
    const dungeonCount = [...this.enemies.values()].filter(e => e.map === "dungeon").length;
    if (forestCount  < 5 && Math.random() < 0.04) this.spawnEnemy("forest");
    if (dungeonCount < 4 && Math.random() < 0.03) this.spawnEnemy("dungeon");
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private allCombatants(): Entity[] {
    return [
      ...(this.player ? [this.player as Entity] : []),
      ...Array.from(this.agents.values()),
      ...Array.from(this.enemies.values()),
    ];
  }

  private pushEvent(e: GameEvent) { this.events.push(e); }

  // Public getters for renderer
  getEntitiesOnMap(mapId: MapId): Entity[] {
    return [
      ...(this.player && this.player.map === mapId ? [this.player as Entity] : []),
      ...Array.from(this.agents.values()).filter(a => a.map === mapId),
      ...Array.from(this.enemies.values()).filter(e => e.map === mapId),
      ...Array.from(this.npcs.values()).filter(n => n.map === mapId),
    ];
  }

  getLootOnMap(mapId: MapId): LootDrop[] {
    return Array.from(this.loot.values()).filter(l => l.map === mapId);
  }

  getPortalsForMap(mapId: MapId): Portal[] {
    return PORTALS.filter(p => p.from === mapId);
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

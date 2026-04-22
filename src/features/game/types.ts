// CreatureQuest — Enhanced Game Types

export type CreatureClass = "beast" | "plant" | "aqua" | "bug" | "reptile";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type AgentState = "idle" | "moving" | "attacking" | "looting" | "fleeing" | "exploring" | "defending";
export type AgentStrategy = "farming" | "hunting" | "exploring";
export type AgentPersonalityType = "farmer" | "aggressive" | "looter" | "scout" | "guardian";
export type AIDecision = "hunt" | "farm" | "explore" | "loot" | "flee" | "defend" | "guild_help";
export type AIPriority = "survival" | "combat" | "economic" | "social" | "exploration";
export type ZoneId = "forest" | "cave" | "dungeon" | "town";

// Element types for skills and combat
export type ElementType = "fire" | "water" | "earth" | "air" | "dark" | "light";
export type SkillType = "attack" | "heal" | "buff" | "debuff" | "AoE" | "ultimate";
export type StatusEffect = "burn" | "freeze" | "poison" | "stun" | "regen" | "shield" | "rage";

export interface CreatureStats {
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  defense: number;
  elementDamage: number; // Bonus damage from element
}

export interface CreatureParts {
  body: string;
  head: string;
  tail: string;
  horn: string;
  wings: string | null;
}

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  element: ElementType;
  damage: number;
  cooldown: number;
  cdRemaining: number;
  duration: number; // For buffs/debuffs
  power: number; // Damage multiplier or heal amount
  description: string;
  targetCount: number;
  icon: string;
}

export interface StatusEffectInstance {
  effect: StatusEffect;
  turnsRemaining: number;
  potency: number;
  sourceId: string;
}

export interface CreatureGenes {
  dominant: Gene;
  recessive: Gene;
  mutations: Mutation[];
}

export interface Gene {
  class: CreatureClass;
  element: ElementType;
  rarity: number; // 0-100, higher = rarer
  stats: {
    hp: number;
    damage: number;
    speed: number;
  };
}

export interface Mutation {
  id: string;
  type: "stat_boost" | "skill_unlock" | "element_change" | "rarity_upgrade";
  value: any;
  timestamp: number;
  stackable: boolean;
}

export interface CreatureSkillTree {
  creatureId: string;
  unlockedSkills: string[];
  skillLevels: Record<string, number>; // skillId -> level (1-5)
  pointsSpent: number;
  pointsAvailable: number;
}

export interface Creature {
  id: string;
  tokenId: number;
  name: string;
  class: CreatureClass;
  rarity: Rarity;
  level: number;
  exp: number;
  expToNext: number;
  stats: CreatureStats;
  parts: CreatureParts;
  skills: Skill[];
  statusEffects: StatusEffectInstance[];
  element?: ElementType;
  breedCount: number;
  maxBreeds: number;
  isEvolved: boolean;
  imageEmoji: string;
  genes?: CreatureGenes;
  skillTree?: CreatureSkillTree;
  personality?: AgentPersonalityType;
  breedingCooldown: number;
}

export interface AgentPersonality {
  aggression: number;      // 0-1, chance to initiate combat
  caution: number;         // 0-1, chance to flee when low HP
  greed: number;           // 0-1, priority for loot collection
  sociability: number;     // 0-1, likelihood to help other agents
  curiosity: number;       // 0-1, tendency to explore unknown areas
  patience: number;        // 0-1, how long to wait for opportunities
}

export interface AgentMemory {
  totalTokensEarned: number;
  battlesWon: number;
  battlesLost: number;
  bestZone: ZoneId | null;
  sessionsRun: number;
  lastKnownEnemy?: { id: string; x: number; y: number; map: string; timestamp: number };
  resourceLocations: Array<{ x: number; y: number; type: "gold" | "xp" | "quest"; discoveredAt: number }>;
  guildAllies: string[]; // agent IDs
  dangerousZones: string[]; // map IDs where agent died or nearly died
  preferences: Record<AIPriority, number>; // weights 0-1
}

export interface Agent {
  id: string;
  creatureId: string;
  state: AgentState;
  strategy: AgentStrategy;
  personality: AgentPersonalityType;
  memory: AgentMemory;
  currentZone: ZoneId;
  isActive: boolean;
  lastTickAt: number;
  tokensThisSession: number;
  behaviorHash: string;
  aiState: AIDecision;
  brainState?: string; // Current decision-making state
}

export interface CombatEvent {
  id: string;
  timestamp: number;
  attacker: string;
  target: string;
  damage: number;
  isCrit: boolean;
  skillUsed: string | null;
  targetDied: boolean;
  tokensEarned: number;
  zone: ZoneId;
  isBossKill?: boolean;
  lootDrops?: LootDrop[];
  elementMultiplier?: number;
  statusEffectsApplied?: StatusEffect[];
}

export interface BossState {
  name: string;
  icon: string;
  currentHp: number;
  maxHp: number;
  phase: 1 | 2; // phase 2 = enraged below 30% HP
  spawnedAt: number;
  specialSkills?: string[];
}

export interface LootDrop {
  type: "token" | "material" | "equipment" | "skill_book";
  name: string;
  amount: number;
  icon: string;
  rarity?: Rarity;
  skillId?: string; // If it's a skill book
}

export interface Enemy {
  id: string;
  name: string;
  type: string;
  level: number;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  zone: ZoneId;
  icon: string;
  tokenReward: number;
  expReward: number;
  element?: ElementType;
  skills?: string[];
}

// Guild system
export interface Guild {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  memberCount: number;
  level: number;
  xp: number;
  treasury: number; // Guild shared gold
  perks: string[]; // Unlocked guild perks
  createdAt: number;
  updatedAt: number;
}

export interface GuildMember {
  guildId: string;
  playerId: string;
  role: "leader" | "officer" | "member";
  joinedAt: number;
  contribution: number;
}

export interface GuildPerk {
  id: string;
  name: string;
  description: string;
  cost: number; // In guild XP
  effect: string;
}

// Chat system
export interface ChatMessage {
  id: string;
  channelId: string; // "global", "guild:{guildId}", "party:{partyId}"
  senderId: string;
  senderName: string;
  message: string;
  messageType: "text" | "emote" | "system" | "trade";
  metadata?: any;
  createdAt: number;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: "global" | "guild" | "party" | "dm";
  members: string[];
}

// Breeding system
export interface BreedingPair {
  parent1: Creature;
  parent2: Creature;
  compatible: boolean;
  compatibilityReason?: string;
}

export interface BreedingResult {
  success: boolean;
  offspring?: Creature;
  result: "success" | "failure" | "mutation" | "rare_drop";
  traits?: "stat_boost" | "skill_unlock" | "element_change" | "rarity_upgrade"[];
  message: string;
  breedingCost: number;
}

export interface BreedingRecord {
  id: string;
  parent1Id: string;
  parent2Id: string;
  offspringId: string;
  breedingCost: number;
  successRate: number;
  result: "success" | "failure" | "mutation" | "rare_drop";
  traits: any;
  createdAt: number;
}

export interface MarketListing {
  id: string;
  sellerAddress: string;
  sellerName: string;
  itemType: "creature" | "material" | "equipment";
  creature?: Creature;
  itemName?: string;
  itemIcon?: string;
  priceQuest: number;
  listedAt: number;
}

export interface LeaderboardEntry {
  rank: number;
  ownerAddress: string;
  ownerName: string;
  ownerAvatar: string;
  agentId: string;
  creatureName: string;
  creatureClass: CreatureClass;
  tokensEarned: number;
  battlesWon: number;
  level: number;
  strategy: AgentStrategy;
  guildId?: string;
  element?: ElementType;
}

export interface ZoneInfo {
  id: ZoneId;
  name: string;
  description: string;
  minLevel: number;
  difficulty: "easy" | "medium" | "hard" | "extreme";
  enemyTypes: string[];
  activeAgents: number;
  icon: string;
  bgColor: string;
  resources: string[];
  tokenMultiplier: number;
  isPvP: boolean;
}

export interface PlayerStats {
  totalCreatures: number;
  activeAgents: number;
  totalTokensEarned: number;
  totalBattlesWon: number;
  highestCreatureLevel: number;
  favoriteZone: ZoneId | null;
  guildId?: string;
  breedingCount: number;
  skillsUnlocked: number;
  statusEffectsApplied: number;
}

// Element strength/weakness chart
export const ELEMENT_CHART: Record<ElementType, { strong: ElementType[]; weak: ElementType[] }> = {
  fire:   { strong: ["earth"],  weak: ["water"] },
  water:  { strong: ["fire"],   weak: ["air"] },
  earth:  { strong: ["air"],    weak: ["fire"] },
  air:    { strong: ["water"],  weak: ["earth"] },
  dark:   { strong: ["light"],  weak: ["light"] },
  light:  { strong: ["dark"],   weak: ["dark"] },
};

// Skill database (key skills)
export const SKILLS_DB: Record<string, Partial<Skill>> = {
  slash: { id: "slash", name: "Slash", type: "attack", element: "air", damage: 10, cooldown: 0, power: 1.0, description: "Basic melee attack", icon: "⚔️" },
  fireball: { id: "fireball", name: "Fireball", type: "attack", element: "fire", damage: 25, cooldown: 2, power: 1.8, description: "Explosive fireball", icon: "🔥" },
  heal: { id: "heal", name: "Heal", type: "heal", element: "light", damage: 0, cooldown: 3, power: 2.5, description: "Restore HP", icon: "💚" },
};

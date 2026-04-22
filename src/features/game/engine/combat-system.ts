// ─── Enhanced Combat System ───────────────────────────────────────────────
// Skills, elements, status effects, and combo system

export type SkillType = "attack" | "heal" | "buff" | "debuff" | "AoE" | "ultimate";
export type ElementType = "fire" | "water" | "earth" | "air" | "dark" | "light";
export type StatusEffect = "burn" | "freeze" | "poison" | "stun" | "regen" | "shield" | "rage";

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  element: ElementType;
  cooldown: number; // turns
  duration: number; // turns for buffs/debuffs
  power: number; // damage multiplier or heal amount
  description: string;
  targetCount: number; // 1 for single target, 99 for AoE
}

export interface StatusEffectInstance {
  effect: StatusEffect;
  turnsRemaining: number;
  potency: number;
  sourceId: string;
}

export interface CreatureSkillTree {
  creatureId: string;
  unlockedSkills: string[];
  skillLevels: Record<string, number>; // skillId -> level (1-5)
  pointsSpent: number;
  pointsAvailable: number;
}

// Element strength/weakness table
export const ELEMENT_CHART: Record<ElementType, { strong: ElementType[]; weak: ElementType[] }> = {
  fire:   { strong: ["earth"],  weak: ["water"] },
  water:  { strong: ["fire"],   weak: ["air"] },
  earth:  { strong: ["air"],    weak: ["fire"] },
  air:    { strong: ["water"],  weak: ["earth"] },
  dark:   { strong: ["light"],  weak: ["light"] },
  light:  { strong: ["dark"],   weak: ["dark"] },
};

// Core skills database
export const SKILLS_DB: Record<string, Skill> = {
  // Basic attacks
  "slash": { id: "slash", name: "Slash", type: "attack", element: "air", cooldown: 0, duration: 0, power: 1.0, description: "Basic melee attack", targetCount: 1 },
  "shoot": { id: "shoot", name: "Shoot", type: "attack", element: "air", cooldown: 0, duration: 0, power: 0.9, description: "Ranged attack", targetCount: 1 },
  
  // Fire skills
  "fireball": { id: "fireball", name: "Fireball", type: "attack", element: "fire", cooldown: 2, duration: 0, power: 1.8, description: "Explosive fireball", targetCount: 1 },
  "inferno": { id: "inferno", name: "Inferno", type: "AoE", element: "fire", cooldown: 5, duration: 0, power: 1.2, description: "Area burn damage", targetCount: 99 },
  "ignite": { id: "ignite", name: "Ignite", type: "debuff", element: "fire", cooldown: 3, duration: 4, power: 0, description: "Apply burn status", targetCount: 1 },
  
  // Water skills
  "hydroblast": { id: "hydroblast", name: "Hydro Blast", type: "attack", element: "water", cooldown: 2, duration: 0, power: 1.7, description: "Powerful water jet", targetCount: 1 },
  "tsunami": { id: "tsunami", name: "Tsunami", type: "AoE", element: "water", cooldown: 6, duration: 0, power: 1.3, description: "Wave damage", targetCount: 99 },
  " Freeze": { id: "freeze", name: "freeze", type: "debuff", element: "water", cooldown: 4, duration: 3, power: 0, description: "freeze target", targetCount: 1 },
  
  // Earth skills
  "rockthrow": { id: "rockthrow", name: "Rock Throw", type: "attack", element: "earth", cooldown: 1, duration: 0, power: 1.5, description: "Hurl boulder", targetCount: 1 },
  "earthquake": { id: "earthquake", name: "Earthquake", type: "AoE", element: "earth", cooldown: 5, duration: 0, power: 1.1, description: "Ground slam", targetCount: 99 },
  "thorns": { id: "thorns", name: "Thorn Armor", type: "buff", element: "earth", cooldown: 4, duration: 5, power: 0.3, description: "Reflect damage", targetCount: 1 },
  
  // Air skills  
  "windstrike": { id: "windstrike", name: "Wind Strike", type: "attack", element: "air", cooldown: 1, duration: 0, power: 1.6, description: "Cyclone attack", targetCount: 1 },
  "tornado": { id: "tornado", name: "Tornado", type: "AoE", element: "air", cooldown: 5, duration: 0, power: 1.2, description: "Whirlwind damage", targetCount: 99 },
  "haste": { id: "haste", name: "Haste", type: "buff", element: "air", cooldown: 4, duration: 4, power: 0, description: "+30% speed", targetCount: 1 },
  
  // Dark skills
  "shadowbolt": { id: "shadowbolt", name: "Shadow Bolt", type: "attack", element: "dark", cooldown: 2, duration: 0, power: 1.9, description: "Dark energy", targetCount: 1 },
  "voidaura": { id: "voidaura", name: "Void Aura", type: "AoE", element: "dark", cooldown: 6, duration: 3, power: -0.2, description: "Drain enemies", targetCount: 99 },
  "curse": { id: "curse", name: "Curse", type: "debuff", element: "dark", cooldown: 3, duration: 4, power: 0, description: "-40% damage", targetCount: 1 },
  
  // Light skills
  "holyfire": { id: "holyfire", name: "Holy Fire", type: "attack", element: "light", cooldown: 2, duration: 0, power: 1.8, description: "Sacred flames", targetCount: 1 },
  "radiance": { id: "radiance", name: "Radiance", type: "AoE", element: "light", cooldown: 5, duration: 0, power: 1.3, description: "Light burst", targetCount: 99 },
  " Heal": { id: "heal", name: "Heal", type: "heal", element: "light", cooldown: 3, duration: 0, power: 2.5, description: "Restore HP", targetCount: 1 },
  "shield": { id: "shield", name: "Divine Shield", type: "buff", element: "light", cooldown: 5, duration: 3, power: 0, description: "Absorb damage", targetCount: 1 },
  
  // Ultimate skills
  "meteor": { id: "meteor", name: "Meteor Storm", type: "ultimate", element: "fire", cooldown: 10, duration: 0, power: 3.5, description: "Devastating meteor shower", targetCount: 99 },
  "resurrection": { id: "resurrection", name: "Resurrection", type: "ultimate", element: "light", cooldown: 15, duration: 0, power: 5.0, description: "Revive fallen ally", targetCount: 1 },
  "apocalypse": { id: "apocalypse", name: "Apocalypse", type: "ultimate", element: "dark", cooldown: 12, duration: 0, power: 4.0, description: "Void devastation", targetCount: 99 },
};

// Skill trees by creature class
export const CLASS_SKILL_TREES: Record<string, string[]> = {
  beast: ["slash", "fireball", "inferno", "thorns", "meteor"],
  plant: ["shoot", "ignite", "freeze", "haste", "resurrection"],
  aqua:  ["hydroblast", "tsunami", "shield", "curse", "meteor"],
  bug:   ["slash", "rockthrow", "poison", "tornado", "apocalypse"],
  reptile: ["shoot", "shadowbolt", "voidaura", "haste", "apocalypse"],
};

// Calculate damage with element modifiers
export function calculateElementMultiplier(attackerElement: ElementType, defenderElement: ElementType): number {
  const att = ELEMENT_CHART[attackerElement];
  if (!att) return 1.0;
  
  if (att.strong.includes(defenderElement)) return 1.5; // Super effective
  if (att.weak.includes(defenderElement)) return 0.7;   // Not effective
  return 1.0; // Neutral
}

// Apply status effect damage/healing over time
export function tickStatusEffects(entity: any, effects: StatusEffectInstance[]): void {
  const toRemove: number[] = [];
  
  effects.forEach((effect, idx) => {
    if (effect.effect === "burn" || effect.effect === "poison") {
      entity.hp -= effect.potency;
      entity.isDead = entity.hp <= 0;
    } else if (effect.effect === "regen") {
      entity.hp = Math.min(entity.hp + effect.potency, entity.maxHp);
    }
    
    effect.turnsRemaining--;
    if (effect.turnsRemaining <= 0) toRemove.push(idx);
  });
  
  // Remove expired effects
  for (let i = toRemove.length - 1; i >= 0; i--) {
    effects.splice(toRemove[i] - (toRemove.length - 1 - i), 1);
  }
}

export function applyStatusEffect(effects: StatusEffectInstance[], effect: StatusEffectInstance): void {
  const existing = effects.findIndex(e => e.effect === effect.effect);
  if (existing >= 0) {
    // Refresh or upgrade
    if (effect.potency > effects[existing].potency) {
      effects[existing] = effect;
    } else {
      effects[existing].turnsRemaining = Math.max(effects[existing].turnsRemaining, effect.turnsRemaining);
    }
  } else {
    effects.push(effect);
  }
}

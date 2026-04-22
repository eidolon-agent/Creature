// ─── Creature Breeding System ─────────────────────────────────────────────
// NFT-based creature breeding with genetic inheritance and mutations

export type BreedingResult = "success" | "failure" | "mutation" | "rare_drop";
export type TraitType = "stat_boost" | "skill_unlock" | "element_change" | "rarity_upgrade";

export interface BreedingPair {
  parent1: Creature;
  parent2: Creature;
  compatible: boolean;
  compatibilityReason?: string;
}

export interface Creature {
  id: string;
  ownerId: number;
  name: string;
  creatureClass: "beast" | "plant" | "aqua" | "bug" | "reptile";
  rarity: "common" | "rare" | "epic" | "legendary";
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  element?: ElementType;
  skills: string[];
  statusEffects: StatusEffectInstance[];
  personality?: "farmer" | "aggressive" | "looter" | "scout" | "guardian";
  imageUri?: string;
  tokenId?: string;
  breedingCount: number;
  breedingCooldown: number; // seconds until can breed again
  genes: CreatureGenes;
}

export interface CreatureGenes {
  dominant: Gene;
  recessive: Gene;
  mutations: Mutation[];
}

export interface Gene {
  class: "beast" | "plant" | "aqua" | "bug" | "reptile";
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
  type: TraitType;
  value: any;
  timestamp: number;
  stackable: boolean;
}

// Breeding configuration
export const BREEDING_CONFIG = {
  baseCost: 100, // QuestToken
  rarityMultipliers: {
    common: 1.0,
    rare: 1.5,
    epic: 2.5,
    legendary: 5.0,
  },
  cooldownHours: 24,
  maxBreedingCount: 5, // Creatures can only breed 5 times
  compatibilityThreshold: 0.6, // Min compatibility score for successful breeding
  mutationChance: 0.15, // 15% chance of mutation
  rarityUpgradeChance: 0.1, // 10% chance to upgrade rarity
};

// ElementType and StatusEffectInstance imports would come from elsewhere
type ElementType = "fire" | "water" | "earth" | "air" | "dark" | "light";
type StatusEffectInstance = {
  effect: "burn" | "freeze" | "poison" | "stun" | "regen" | "shield" | "rage";
  turnsRemaining: number;
  potency: number;
  sourceId: string;
};

// Check if two creatures can breed
export function checkBreedingCompatibility(parent1: Creature, parent2: Creature): BreedingPair {
  // Check breeding limits
  if (parent1.breedingCount >= BREEDING_CONFIG.maxBreedingCount) {
    return {
      parent1,
      parent2,
      compatible: false,
      compatibilityReason: "Parent 1 has reached maximum breeding count",
    };
  }
  
  if (parent2.breedingCount >= BREEDING_CONFIG.maxBreedingCount) {
    return {
      parent1,
      parent2,
      compatible: false,
      compatibilityReason: "Parent 2 has reached maximum breeding count",
    };
  }
  
  // Check cooldowns
  if (parent1.breedingCooldown > 0) {
    return {
      parent1,
      parent2,
      compatible: false,
      compatibilityReason: `Parent 1 is on breeding cooldown (${parent1.breedingCooldown}s remaining)`,
    };
  }
  
  if (parent2.breedingCooldown > 0) {
    return {
      parent1,
      parent2,
      compatible: false,
      compatibilityReason: `Parent 2 is on breeding cooldown (${parent2.breedingCooldown}s remaining)`,
    };
  }
  
  // Check same owner (optional rule - can be disabled)
  // if (parent1.ownerId !== parent2.ownerId) {
  //   return {
  //     parent1,
  //     parent2,
  //     compatible: false,
  //     compatibilityReason: "Both creatures must belong to the same owner",
  //   };
  // }
  
  return {
    parent1,
    parent2,
    compatible: true,
  };
}

// Calculate breeding cost based on rarities
export function calculateBreedingCost(parent1: Creature, parent2: Creature): number {
  const base = BREEDING_CONFIG.baseCost;
  const multiplier1 = BREEDING_CONFIG.rarityMultipliers[parent1.rarity];
  const multiplier2 = BREEDING_CONFIG.rarityMultipliers[parent2.rarity];
  const avgMultiplier = (multiplier1 + multiplier2) / 2;
  
  return Math.floor(base * avgMultiplier);
}

// Perform breeding and create offspring
export function breedCreatures(
  parent1: Creature,
  parent2: Creature,
  breedingCost: number
): {
  success: boolean;
  offspring?: Creature;
  result: BreedingResult;
  traits?: TraitType[];
  message: string;
} {
  const compatibility = checkBreedingCompatibility(parent1, parent2);
  if (!compatibility.compatible) {
    return {
      success: false,
      result: "failure",
      message: compatibility.compatibilityReason || "Breeding incompatibility",
    };
  }
  
  // Deduct breeding cost (would be handled by blockchain smart contract)
  // For now, we just check
  
  // Genetic inheritance
  const offspringGenes = inheritGenes(parent1.genes, parent2.genes);
  
  // Determine breeding result
  let result: BreedingResult = "success";
  const traits: TraitType[] = [];
  
  // Check for mutation
  if (Math.random() < BREEDING_CONFIG.mutationChance) {
    result = "mutation";
    const mutation = generateMutation(offspringGenes);
    offspringGenes.mutations.push(mutation);
    traits.push(mutation.type);
  }
  
  // Check for rarity upgrade
  if (Math.random() < BREEDING_CONFIG.rarityUpgradeChance) {
    result = "rare_drop";
    const upgradedRarity = upgradeRarity([parent1.rarity, parent2.rarity]);
    traits.push("rarity_upgrade");
    offspringGenes.dominant.rarity = calculateRarityValue(upgradedRarity);
  }
  
  // Create offspring
  const offspringId = `creature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const offspring: Creature = {
    id: offspringId,
    ownerId: parent1.ownerId, // Inherit from parent 1
    name: generateOffspringName(parent1.name, parent2.name),
    creatureClass: offspringGenes.dominant.class,
    rarity: rarityFromValue(offspringGenes.dominant.rarity),
    level: 1,
    xp: 0,
    hp: offspringGenes.dominant.stats.hp,
    maxHp: offspringGenes.dominant.stats.hp,
    damage: offspringGenes.dominant.stats.damage,
    speed: offspringGenes.dominant.stats.speed,
    element: offspringGenes.dominant.element,
    skills: determineOffspringSkills(parent1, parent2, offspringGenes),
    statusEffects: [],
    personality: selectPersonality(parent1.personality, parent2.personality),
    imageUri: undefined, // Would be generated/minted
    tokenId: undefined, // Would be minted on-chain
    breedingCount: 0,
    breedingCooldown: BREEDING_CONFIG.cooldownHours * 3600,
    genes: offspringGenes,
  };
  
  // Update parent breeding counts and cooldowns
  parent1.breedingCount++;
  parent1.breedingCooldown = BREEDING_CONFIG.cooldownHours * 3600;
  parent2.breedingCount++;
  parent2.breedingCooldown = BREEDING_CONFIG.cooldownHours * 3600;
  
  // Apply mutations to offspring stats
  applyMutations(offspring, offspringGenes.mutations);
  
  return {
    success: true,
    offspring,
    result,
    traits,
    message: result === "mutation" 
      ? "Mutation! New traits discovered!" 
      : result === "rare_drop" 
        ? "Rarity upgrade! Offspring is rarer than parents!"
        : "Breeding successful! Offspring created.",
  };
}

// Genetic inheritance algorithm
function inheritGenes(genes1: CreatureGenes, genes2: CreatureGenes): CreatureGenes {
  // 70% chance to inherit dominant, 30% chance for recessive from each parent
  const dominantGene = Math.random() < 0.7 
    ? (Math.random() < 0.5 ? genes1.dominant : genes2.dominant)
    : (Math.random() < 0.5 ? genes1.recessive : genes2.recessive);
  
  const recessiveGene = Math.random() < 0.5 ? genes1.recessive : genes2.recessive;
  
  // Blend stats with some randomness
  const blendedStats = {
    hp: Math.floor((dominantGene.stats.hp + recessiveGene.stats.hp) / 2 * (0.9 + Math.random() * 0.2)),
    damage: Math.floor((dominantGene.stats.damage + recessiveGene.stats.damage) / 2 * (0.9 + Math.random() * 0.2)),
    speed: Math.floor((dominantGene.stats.speed + recessiveGene.stats.speed) / 2 * (0.9 + Math.random() * 0.2)),
  };
  
  // Select element (priority: legendary > epic > rare > common)
  const elements = [dominantGene.element, recessiveGene.element];
  const element = elements[Math.floor(Math.random() * elements.length)];
  
  return {
    dominant: {
      class: dominantGene.class,
      element: element || "fire",
      rarity: dominantGene.rarity,
      stats: blendedStats,
    },
    recessive: {
      class: recessiveGene.class,
      element: recessiveGene.element || "earth",
      rarity: recessiveGene.rarity,
      stats: { ...blendedStats },
    },
    mutations: [],
  };
}

// Generate a random mutation
function generateMutation(genes: CreatureGenes): Mutation {
  const mutationTypes: TraitType[] = ["stat_boost", "skill_unlock", "element_change"];
  const type = mutationTypes[Math.floor(Math.random() * mutationTypes.length)];
  
  switch (type) {
    case "stat_boost":
      return {
        id: `mutation_${Date.now()}`,
        type: "stat_boost",
        value: { stat: "damage", percent: 10 + Math.random() * 20 },
        timestamp: Date.now(),
        stackable: true,
      };
    
    case "skill_unlock":
      const allSkills = ["fireball", "hydroblast", "rockthrow", "windstrike", "shadowbolt", "holyfire"];
      return {
        id: `mutation_${Date.now()}`,
        type: "skill_unlock",
        value: { skillId: allSkills[Math.floor(Math.random() * allSkills.length)] },
        timestamp: Date.now(),
        stackable: false,
      };
    
    case "element_change":
      const elements: ElementType[] = ["fire", "water", "earth", "air", "dark", "light"];
      return {
        id: `mutation_${Date.now()}`,
        type: "element_change",
        value: { element: elements[Math.floor(Math.random() * elements.length)] },
        timestamp: Date.now(),
        stackable: false,
      };
    
    default:
      return {
        id: `mutation_${Date.now()}`,
        type: "stat_boost",
        value: { stat: "hp", percent: 10 },
        timestamp: Date.now(),
        stackable: true,
      };
  }
}

// Apply mutations to offspring
function applyMutations(creature: Creature, mutations: Mutation[]): void {
  for (const mutation of mutations) {
    if (mutation.type === "stat_boost") {
      const boost = mutation.value;
      if (boost.stat === "damage") {
        creature.damage = Math.floor(creature.damage * (1 + boost.percent / 100));
      } else if (boost.stat === "hp") {
        creature.maxHp = Math.floor(creature.maxHp * (1 + boost.percent / 100));
        creature.hp = creature.maxHp;
      } else if (boost.stat === "speed") {
        creature.speed = Math.floor(creature.speed * (1 + boost.percent / 100));
      }
    } else if (mutation.type === "skill_unlock") {
      if (!creature.skills.includes(mutation.value.skillId)) {
        creature.skills.push(mutation.value.skillId);
      }
    } else if (mutation.type === "element_change") {
      creature.element = mutation.value.element;
    }
  }
}

// Upgrade rarity based on parent rarities
function upgradeRarity(parentRarities: ("common" | "rare" | "epic" | "legendary")[]): "common" | "rare" | "epic" | "legendary" {
  const rarityOrder = ["common", "rare", "epic", "legendary"];
  const maxParentRarity = Math.max(
    rarityOrder.indexOf(parentRarities[0]),
    rarityOrder.indexOf(parentRarities[1])
  );
  
  // 30% chance to upgrade one level
  if (Math.random() < 0.3 && maxParentRarity < 3) {
    return rarityOrder[maxParentRarity + 1];
  }
  
  return rarityOrder[maxParentRarity];
}

function rarityFromValue(value: number): "common" | "rare" | "epic" | "legendary" {
  if (value >= 90) return "legendary";
  if (value >= 70) return "epic";
  if (value >= 40) return "rare";
  return "common";
}

function calculateRarityValue(rarity: "common" | "rare" | "epic" | "legendary"): number {
  switch (rarity) {
    case "legendary": return 90 + Math.random() * 10;
    case "epic": return 70 + Math.random() * 20;
    case "rare": return 40 + Math.random() * 30;
    default: return Math.random() * 40;
  }
}

// Generate offspring name
function generateOffspringName(parent1Name: string, parent2Name: string): string {
  const prefixes = ["Nova", "Zen", "Astra", "Pyro", "Aqu", "Terr", "Zephyr", "Shadow", "Light", "Void"];
  const suffixes = ["nox", "ian", "us", "ora", "ix", "ax", "on", "ek", "ar", "im"];
  
  const combinedBase = parent1Name.slice(0, Math.ceil(parent1Name.length / 2)) + 
                       parent2Name.slice(Math.floor(parent2Name.length / 2));
  
  const randomElement = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return `${randomElement}${combinedBase.slice(0, 3)}${randomSuffix}`;
}

// Determine offspring skills from parents
function determineOffspringSkills(parent1: Creature, parent2: Creature, genes: CreatureGenes): string[] {
  const parentSkills = new Set([...parent1.skills, ...parent2.skills]);
  const offspringSkills = Array.from(parentSkills);
  
  // 40% chance to gain a new skill from gene pool
  if (Math.random() < 0.4) {
    const skillPool = ["slash", "shoot", "fireball", "hydroblast", "rockthrow", "windstrike"];
    const newSkill = skillPool[Math.floor(Math.random() * skillPool.length)];
    if (!offspringSkills.includes(newSkill)) {
      offspringSkills.push(newSkill);
    }
  }
  
  // Limit to max 6 skills
  return offspringSkills.slice(0, 6);
}

// Select personality from parents
function selectPersonality(p1?: string, p2?: string): string {
  if (!p1 && !p2) return "farmer";
  if (!p1) return p2!;
  if (!p2) return p1;
  
  return Math.random() < 0.5 ? p1 : p2;
}

// Create default genes for a new creature
export function createDefaultGenes(
  creatureClass: "beast" | "plant" | "aqua" | "bug" | "reptile",
  rarity: "common" | "rare" | "epic" | "legendary"
): CreatureGenes {
  const baseStats = {
    beast: { hp: 120, damage: 25, speed: 100 },
    plant: { hp: 150, damage: 15, speed: 80 },
    aqua: { hp: 110, damage: 20, speed: 140 },
    bug: { hp: 90, damage: 30, speed: 160 },
    reptile: { hp: 130, damage: 22, speed: 110 },
  };
  
  const rarityMultiplier = {
    common: 1.0,
    rare: 1.3,
    epic: 1.6,
    legendary: 2.0,
  };
  
  const mult = rarityMultiplier[rarity];
  const stats = baseStats[creatureClass];
  
  const dominantGene: Gene = {
    class: creatureClass,
    element: getRandomElement(),
    rarity: calculateRarityValue(rarity),
    stats: {
      hp: Math.floor(stats.hp * mult),
      damage: Math.floor(stats.damage * mult),
      speed: Math.floor(stats.speed * mult),
    },
  };
  
  return {
    dominant: dominantGene,
    recessive: {
      ...dominantGene,
      element: getRandomElement(),
    },
    mutations: [],
  };
}

function getRandomElement(): ElementType {
  const elements: ElementType[] = ["fire", "water", "earth", "air", "dark", "light"];
  return elements[Math.floor(Math.random() * elements.length)];
}

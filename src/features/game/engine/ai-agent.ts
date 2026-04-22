// AI Agent Combat System - 3-Layer Brain Architecture
// Personalities: Farmer, Aggressive, Looter, Scout, Guardian

import { CreatureState, GameState } from './types';
import { calculateCombatOutcome } from './combat-system';

// ============ PERSONALITY DEFINITIONS ============
export enum AgentPersonality {
  FARMER = 'farmer',        // Passive, avoids combat, gathers resources
  AGGRESSIVE = 'aggressive', // Seeks combat, high risk-tolerance
  LOOTER = 'looter',        // Targets weakened enemies, opportunistic
  SCOUT = 'scout',          // Explores, avoids engagement, maps territory
  GUARDIAN = 'guardian'     // Protects allies, defensive positioning
}

export interface PersonalityTraits {
  aggression: number;       // 0-100, how likely to initiate combat
  riskTolerance: number;    // 0-100, willingness to take damage
  retreatThreshold: number; // HP% at which to flee (0-100)
  lootingPriority: number;  // 0-100, how much to prioritize loot
  exploration: number;      // 0-100, tendency to explore new areas
  teamSupport: number;      // 0-100, how much to help allies
}

export const PERSONALITY_TRAITS: Record<AgentPersonality, PersonalityTraits> = {
  [AgentPersonality.FARMER]: {
    aggression: 10,
    riskTolerance: 20,
    retreatThreshold: 70,
    lootingPriority: 30,
    exploration: 40,
    teamSupport: 20,
  },
  [AgentPersonality.AGGRESSIVE]: {
    aggression: 95,
    riskTolerance: 90,
    retreatThreshold: 20,
    lootingPriority: 50,
    exploration: 30,
    teamSupport: 10,
  },
  [AgentPersonality.LOOTER]: {
    aggression: 60,
    riskTolerance: 50,
    retreatThreshold: 50,
    lootingPriority: 100,
    exploration: 20,
    teamSupport: 15,
  },
  [AgentPersonality.Scout]: {
    aggression: 5,
    riskTolerance: 25,
    retreatThreshold: 80,
    lootingPriority: 10,
    exploration: 100,
    teamSupport: 5,
  },
  [AgentPersonality.GUARDIAN]: {
    aggression: 40,
    riskTolerance: 70,
    retreatThreshold: 40,
    lootingPriority: 20,
    exploration: 30,
    teamSupport: 100,
  },
};

// ============ BRAIN LAYERS ============

/**
 * Layer 1: Perception
 * - Assess surroundings
 * - Detect threats, allies, resources
 * - Build mental map
 */
interface Perception {
  enemies: Array<{
    id: string;
    distance: number;
    hpPercent: number;
    threatLevel: number; // 1-10
    type: string;
  }>;
  allies: Array<{
    id: string;
    distance: number;
    hpPercent: number;
    needsHelp: boolean;
  }>;
  resources: Array<{
    type: 'health_potion' | 'mana_potion' | 'loot' | 'experience';
    distance: number;
    value: number;
  }>;
  terrain: {
    cover: boolean;
    chokepoint: boolean;
    escapeRoutes: number;
  };
}

/**
 * Layer 2: Decision Making
 * - Evaluate options based on personality
 * - Calculate utilities
 * - Make choice
 */
interface Decision {
  action: 'attack' | 'flee' | 'heal' | 'explore' | 'loot' | 'support' | 'defend';
  target: string | null;
  priority: number; // 0-100
  reasoning: string;
  riskScore: number; // 0-100
}

/**
 * Layer 3: Execution
 * - Convert decision to commands
 * - Monitor progress
 * - Adjust if needed
 */
interface Execution {
  commands: string[];
  cooldowns: Map<string, number>;
  currentAction: string | null;
  startTime: number;
}

// ============ AI AGENT CLASS ============
export class AIAgent {
  private personality: AgentPersonality;
  private traits: PersonalityTraits;
  private perception: Perception = this.initPerception();
  private decision: Decision | null = null;
  private execution: Execution = this.initExecution();
  
  constructor(personality: AgentPersonality) {
    this.personality = personality;
    this.traits = PERSONALITY_TRAITS[personality];
  }

  private initPerception(): Perception {
    return {
      enemies: [],
      allies: [],
      resources: [],
      terrain: {
        cover: false,
        chokepoint: false,
        escapeRoutes: 0,
      },
    };
  }

  private initExecution(): Execution {
    return {
      commands: [],
      cooldowns: new Map(),
      currentAction: null,
      startTime: 0,
    };
  }

  // ============ PERCEPTION LAYER ============
  perceive(gameState: GameState, self: CreatureState): void {
    this.perception = this.initPerception();
    
    // Scan for enemies
    gameState.enemies.forEach(enemy => {
      const distance = this.calculateDistance(self, enemy);
      const hpPercent = (enemy.hp / enemy.maxHp) * 100;
      const threatLevel = this.assessThreat(enemy);
      
      if (distance < 20) { // Detection range
        this.perception.enemies.push({
          id: enemy.id,
          distance,
          hpPercent,
          threatLevel,
          type: enemy.species,
        });
      }
    });
    
    // Scan for allies
    gameState.allies.forEach(ally => {
      const distance = this.calculateDistance(self, ally);
      const hpPercent = (ally.hp / ally.maxHp) * 100;
      
      if (distance < 30) {
        this.perception.allies.push({
          id: ally.id,
          distance,
          hpPercent,
          needsHelp: hpPercent < 50,
        });
      }
    });
    
    // Scan for resources
    gameState.items.forEach(item => {
      const distance = this.calculateDistance(self, item);
      if (distance < 15) {
        this.perception.resources.push({
          type: item.type as any,
          distance,
          value: item.value || 10,
        });
      }
    });
    
    // Analyze terrain
    this.perception.terrain = this.analyzeTerrain(self.x, self.y, gameState.map);
  }

  private calculateDistance(a: {x: number, y: number}, b: {x: number, y: number}): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  private assessThreat(enemy: CreatureState): number {
    // 1-10 scale based on enemy stats
    const powerLevel = enemy.attack + enemy.level * 5;
    return Math.min(10, Math.floor(powerLevel / 20));
  }

  private analyzeTerrain(x: number, y: number, map: any[]): {
    cover: boolean;
    chokepoint: boolean;
    escapeRoutes: number;
  } {
    // Simplified terrain analysis
    const neighbors = map.filter(tile => {
      const dx = Math.abs(tile.x - x);
      const dy = Math.abs(tile.y - y);
      return dx <= 1 && dy <= 1;
    });

    const cover = neighbors.some(t => t.type === 'rock' || t.type === 'tree');
    const chokepoint = neighbors.length <= 3;
    const escapeRoutes = neighbors.filter(t => t.walkable).length;

    return { cover, chokepoint, escapeRoutes };
  }

  // ============ DECISION LAYER ============
  decide(self: CreatureState): Decision {
    const traits = this.traits;
    const perception = this.perception;
    
    // Check retreat condition
    const hpPercent = (self.hp / self.maxHp) * 100;
    if (hpPercent < traits.retreatThreshold && perception.enemies.length > 0) {
      return {
        action: 'flee',
        target: null,
        priority: 100,
        reasoning: `HP too low (${hpPercent.toFixed(0)}%), fleeing to safety`,
        riskScore: 90,
      };
    }

    // Personality-based decision tree
    switch (this.personality) {
      case AgentPersonality.FARMER:
        return this.makeFarmerDecision(self, perception);
      
      case AgentPersonality.AGGRESSIVE:
        return this.makeAggressiveDecision(self, perception);
      
      case AgentPersonality.LOOTER:
        return this.makeLooterDecision(self, perception);
      
      case AgentPersonality.Scout:
        return this.makeScoutDecision(self, perception);
      
      case AgentPersonality.GUARDIAN:
        return this.makeGuardianDecision(self, perception);
      
      default:
        return this.makeNeutralDecision(self, perception);
    }
  }

  private makeFarmerDecision(self: CreatureState, perception: Perception): Decision {
    // Avoid combat, gather resources
    if (perception.resources.length > 0) {
      const bestResource = perception.resources
        .sort((a, b) => b.value - a.value)[0];
      
      return {
        action: 'loot',
        target: bestResource.type,
        priority: 80,
        reasoning: 'Gathering resources, avoiding conflict',
        riskScore: 10,
      };
    }
    
    if (perception.enemies.length > 0 && perception.terrain.escapeRoutes > 0) {
      return {
        action: 'flee',
        target: null,
        priority: 90,
        reasoning: 'Running from danger to find safer areas',
        riskScore: 85,
      };
    }
    
    return {
      action: 'explore',
      target: null,
      priority: 50,
      reasoning: 'Exploring for resources and safe zones',
      riskScore: 20,
    };
  }

  private makeAggressiveDecision(self: CreatureState, perception: Perception): Decision {
    // Seek combat, high risk tolerance
    if (perception.enemies.length > 0) {
      const target = perception.enemies
        .sort((a, b) => b.hpPercent - a.hpPercent)[0]; // Weakest first
      
      return {
        action: 'attack',
        target: target.id,
        priority: 95,
        reasoning: `Engaging ${target.type} (HP: ${target.hpPercent.toFixed(0)}%)`,
        riskScore: 30,
      };
    }
    
    return {
      action: 'explore',
      target: null,
      priority: 40,
      reasoning: 'Searching for combat opportunities',
      riskScore: 15,
    };
  }

  private makeLooterDecision(self: CreatureState, perception: Perception): Decision {
    // Target weakened enemies, prioritize loot
    const woundedEnemies = perception.enemies.filter(e => e.hpPercent < 40);
    
    if (woundedEnemies.length > 0) {
      return {
        action: 'attack',
        target: woundedEnemies[0].id,
        priority: 90,
        reasoning: `Finishing off weakened ${woundedEnemies[0].type}`,
        riskScore: 25,
      };
    }
    
    if (perception.resources.length > 0) {
      const bestLoot = perception.resources
        .sort((a, b) => b.value - a.value)[0];
      
      return {
        action: 'loot',
        target: bestLoot.type,
        priority: 85,
        reasoning: 'Opportunistic looting',
        riskScore: 10,
      };
    }
    
    return {
      action: 'explore',
      target: null,
      priority: 50,
      reasoning: 'Looking for weakened targets',
      riskScore: 20,
    };
  }

  private makeScoutDecision(self: CreatureState, perception: Perception): Decision {
    // Explore, avoid engagement
    if (perception.enemies.some(e => e.threatLevel >= 7)) {
      return {
        action: 'flee',
        target: null,
        priority: 100,
        reasoning: 'Avoiding high-threat enemies',
        riskScore: 95,
      };
    }
    
    return {
      action: 'explore',
      target: null,
      priority: 80,
      reasoning: 'Mapping territory, gathering intel',
      riskScore: 10,
    };
  }

  private makeGuardianDecision(self: CreatureState, perception: Perception): Decision {
    // Protect allies, defensive
    const needyAllies = perception.allies.filter(a => a.needsHelp);
    
    if (needyAllies.length > 0) {
      const closest = needyAllies.sort((a, b) => a.distance - b.distance)[0];
      
      return {
        action: 'support',
        target: closest.id,
        priority: 95,
        reasoning: `Defending ally at ${closest.distance} units`,
        riskScore: 40,
      };
    }
    
    if (perception.enemies.length > 0) {
      return {
        action: 'defend',
        target: null,
        priority: 70,
        reasoning: 'Holding position against enemies',
        riskScore: 50,
      };
    }
    
    return {
      action: 'explore',
      target: null,
      priority: 40,
      reasoning: 'Patrolling area for threats',
      riskScore: 20,
    };
  }

  private makeNeutralDecision(self: CreatureState, perception: Perception): Decision {
    // Balanced approach
    if (perception.enemies.length > 0 && self.hp > self.maxHp * 0.7) {
      return {
        action: 'attack',
        target: perception.enemies[0].id,
        priority: 60,
        reasoning: 'Engaging enemy with healthy HP',
        riskScore: 40,
      };
    }
    
    return {
      action: 'explore',
      target: null,
      priority: 50,
      reasoning: 'Exploring safely',
      riskScore: 25,
    };
  }

  // ============ EXECUTION LAYER ============
  execute(gameState: GameState, self: CreatureState): string[] {
    if (!this.decision) {
      this.decision = self.decide(self);
    }
    
    const commands: string[] = [];
    const decision = this.decision;
    
    switch (decision.action) {
      case 'attack':
        commands.push(`ATTACK ${decision.target}`);
        this.execution.currentAction = 'attack';
        break;
      
      case 'flee':
        commands.push('MOVE random_direction 10');
        this.execution.currentAction = 'flee';
        break;
      
      case 'heal':
        commands.push('USE health_potion');
        this.execution.currentAction = 'heal';
        break;
      
      case 'loot':
        commands.push(`LOOT ${decision.target}`);
        this.execution.currentAction = 'loot';
        break;
      
      case 'explore':
        commands.push('MOVE random_direction 5');
        this.execution.currentAction = 'explore';
        break;
      
      case 'support':
        commands.push(`SUPPORT ${decision.target}`);
        this.execution.currentAction = 'support';
        break;
      
      case 'defend':
        commands.push('DEFEND');
        this.execution.currentAction = 'defend';
        break;
    }
    
    return commands;
  }

  // ============ MAIN AI LOOP ============
  update(gameState: GameState, self: CreatureState): string[] {
    // 1. PERCEIVE
    this.perceive(gameState, self);
    
    // 2. DECIDE
    this.decision = this.decide(self);
    
    // 3. EXECUTE
    const commands = this.execute(gameState, self);
    
    // Log decision for debugging
    console.log(`🤖 ${this.personability.toUpperCase()}:`, this.decision.reasoning);
    
    return commands;
  }

  getDecision(): Decision | null {
    return this.decision;
  }

  getPerception(): Perception {
    return this.perception;
  }
}

// ============ FACTORY ============
export function createAgent(personality: AgentPersonality): AIAgent {
  return new AIAgent(personality);
}

export function createRandomAgent(): AIAgent {
  const personalities = Object.values(AgentPersonality);
  const random = personalities[Math.floor(Math.random() * personalities.length)];
  return createAgent(random);
}

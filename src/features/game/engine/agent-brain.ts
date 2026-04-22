// ─── Enhanced AI Agent System ─────────────────────────────────────────────
// 3-layer brain architecture: Perception → Decision → Action

export type AIDecision = "hunt" | "farm" | "explore" | "loot" | "flee" | "defend" | "guild_help";
export type AIPriority = "survival" | "combat" | "economic" | "social" | "exploration";

export interface AgentMemory {
  lastKnownEnemy?: { id: string; x: number; y: number; map: string; timestamp: number };
  resourceLocations: Array<{ x: number; y: number; type: "gold" | "xp" | "quest"; discoveredAt: number }>;
  guildAllies: string[]; // agent IDs
  dangerousZones: string[]; // map IDs where agent died or nearly died
  preferences: Record<AIPriority, number>; // weights 0-1
}

export interface AgentSenses {
  nearbyEnemies: Array<{ id: string; distance: number; hpRatio: number; map: string }>;
  nearbyAllies: Array<{ id: string; distance: number; hpRatio: number; isPlayer: boolean }>;
  nearbyLoot: Array<{ x: number; y: number; type: "gold" | "quest_item"; amount?: number }>;
  visibleQuests: Array<{ npcId: string; distance: number; completed: boolean }>;
  environmentalHazards: Array<{ type: "pvp_zone" | "high_level_area"; map: string }>;
}

// Personality traits that modify AI behavior
export interface AIPersonality {
  aggression: number;      // 0-1, chance to initiate combat
  caution: number;         // 0-1, chance to flee when low HP
  greed: number;           // 0-1, priority for loot collection
  sociability: number;     // 0-1, likelihood to help other agents
  curiosity: number;       // 0-1, tendency to explore unknown areas
  patience: number;        // 0-1, how long to wait for opportunities
}

// Default personality templates
export const PERSONALITY_TEMPLATES: Record<string, AIPersonality> = {
  farmer: {
    aggression: 0.2,
    caution: 0.7,
    greed: 0.3,
    sociability: 0.6,
    curiosity: 0.4,
    patience: 0.8,
  },
  aggressive: {
    aggression: 0.9,
    caution: 0.2,
    greed: 0.4,
    sociability: 0.3,
    curiosity: 0.7,
    patience: 0.3,
  },
  looter: {
    aggression: 0.4,
    caution: 0.5,
    greed: 0.95,
    sociability: 0.2,
    curiosity: 0.5,
    patience: 0.6,
  },
  scout: {
    aggression: 0.3,
    caution: 0.6,
    greed: 0.2,
    sociability: 0.7,
    curiosity: 0.95,
    patience: 0.4,
  },
  guardian: {
    aggression: 0.6,
    caution: 0.5,
    greed: 0.1,
    sociability: 0.9,
    curiosity: 0.2,
    patience: 0.8,
  },
};

//三层大脑架构实现
export class AgentBrain {
  private perception: AgentSenses;
  private memory: AgentMemory;
  private personality: AIPersonality;
  private currentDecision: AIDecision;
  private decisionCooldown: number;
  
  constructor(personalityType: string = "farmer") {
    this.personality = { ...PERSONALITY_TEMPLATES[personalityType] };
    this.memory = {
      resourceLocations: [],
      guildAllies: [],
      dangerousZones: [],
      preferences: {
        survival: 0.8,
        combat: personalityType === "aggressive" ? 0.9 : 0.3,
        economic: personalityType === "looter" ? 0.9 : 0.4,
        social: personalityType === "farmer" ? 0.7 : 0.3,
        exploration: personalityType === "scout" ? 0.9 : 0.4,
      },
    };
    this.perception = this.createEmptySenses();
    this.currentDecision = "explore";
    this.decisionCooldown = 0;
  }
  
  private createEmptySenses(): AgentSenses {
    return {
      nearbyEnemies: [],
      nearbyAllies: [],
      nearbyLoot: [],
      visibleQuests: [],
      environmentalHazards: [],
    };
  }
  
  // 感知层：收集周围环境信息
  updatePerception(
    enemies: any[],
    allies: any[],
    loot: any[],
    quests: any[],
    agentPosition: { x: number; y: number; map: string }
  ): void {
    this.perception = this.createEmptySenses();
    
    // Scan enemies
    for (const enemy of enemies) {
      if (enemy.map !== agentPosition.map) continue;
      const dx = enemy.x - agentPosition.x;
      const dy = enemy.y - agentPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 300) { // Vision radius
        this.perception.nearbyEnemies.push({
          id: enemy.id,
          distance,
          hpRatio: enemy.hp / enemy.maxHp,
          map: enemy.map,
        });
      }
    }
    
    // Scan allies
    for (const ally of allies) {
      if (ally.map !== agentPosition.map) continue;
      const dx = ally.x - agentPosition.x;
      const dy = ally.y - agentPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 400) {
        this.perception.nearbyAllies.push({
          id: ally.id,
          distance,
          hpRatio: ally.hp / ally.maxHp,
          isPlayer: ally.type === "player",
        });
      }
    }
    
    // Scan loot
    for (const item of loot) {
      if (item.map !== agentPosition.map) continue;
      const dx = item.x - agentPosition.x;
      const dy = item.y - agentPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 200) {
        this.perception.nearbyLoot.push({
          x: item.x,
          y: item.y,
          type: "gold",
          amount: item.amount,
        });
      }
    }
    
    // Scan NPCs
    for (const npc of quests) {
      if (npc.map !== agentPosition.map) continue;
      const dx = npc.x - agentPosition.x;
      const dy = npc.y - agentPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 150) {
        this.perception.visibleQuests.push({
          npcId: npc.npcId,
          distance,
          completed: npc.completed || false,
        });
      }
    }
    
    // Environmental awareness
    if (agentPosition.map === "dungeon") {
      this.perception.environmentalHazards.push({ type: "pvp_zone", map: "dungeon" });
    }
  }
  
  // 决策层：基于感知和记忆做出决策
  makeDecision(): AIDecision {
    if (this.decisionCooldown > 0) {
      this.decisionCooldown--;
      return this.currentDecision;
    }
    
    const hpRatio = 1.0; // Would need current HP state
    let scores: Record<AIDecision, number> = {
      hunt: 0,
      farm: 0,
      explore: 0,
      loot: 0,
      flee: 0,
      defend: 0,
      guild_help: 0,
    };
    
    // SURVIVAL PRIORITY
    if (this.perception.nearbyEnemies.length > 0) {
      const dangerousEnemies = this.perception.nearbyEnemies.filter(e => 
        e.hpRatio > 0.7 && e.distance < 100
      );
      
      if (dangerousEnemies.length > 0 && hpRatio < 0.3 && this.personality.caution > 0.5) {
        scores.flee = 100;
      } else if (dangerousEnemies.length > 0 && this.personality.aggression > 0.6) {
        scores.hunt = 80;
        scores.defend = 60;
      } else {
        scores.defend = 40;
      }
    }
    
    // ECONOMIC PRIORITY (loot/gold)
    if (this.personality.greed > 0.7 && this.perception.nearbyLoot.length > 0) {
      scores.loot = 70;
      scores.farm = 50;
    }
    
    // SOCIAL PRIORITY
    if (this.personality.sociability > 0.6) {
      const isolatedAllies = this.perception.nearbyAllies.filter(a => 
        a.distance > 200 && a.hpRatio < 0.5
      );
      if (isolatedAllies.length > 0) {
        scores.guild_help = 75;
        scores.defend = 50;
      }
    }
    
    // EXPLORATION PRIORITY
    if (this.personality.curiosity > 0.6 && this.perception.nearbyEnemies.length === 0) {
      scores.explore = 60;
    }
    
    // DECISION MATRIX - weighted roll based on personality
    const priorities = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(([decision]) => decision as AIDecision);
    
    // Apply personality modifiers
    const roll = Math.random();
    if (roll < 0.3) {
      // Stick with highest score
      this.currentDecision = priorities[0] || "explore";
    } else if (roll < 0.6 && priorities.length > 1) {
      // Second highest
      this.currentDecision = priorities[1];
    } else {
      // Random weighted by personality
      this.currentDecision = this.weightedDecision();
    }
    
    this.decisionCooldown = 30; // 30 frames before re-decision
    return this.currentDecision;
  }
  
  private weightedDecision(): AIDecision {
    const r = Math.random() * 100;
    const weights = {
      hunt: this.personality.aggression * 30 + this.memory.preferences.combat * 20,
      farm: (1 - this.personality.aggression) * 25 + this.memory.preferences.economic * 20,
      explore: this.personality.curiosity * 35 + this.memory.preferences.exploration * 25,
      loot: this.personality.greed * 40 + this.memory.preferences.economic * 15,
      flee: this.personality.caution * 30 + this.memory.preferences.survival * 35,
      defend: this.personality.sociability * 20 + 15,
      "guild_help": this.personality.sociability * 35 + this.memory.preferences.social * 25,
    };
    
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let cumulative = 0;
    
    for (const [decision, weight] of Object.entries(weights)) {
      cumulative += (weight / total) * 100;
      if (r < cumulative) {
        return decision as AIDecision;
      }
    }
    
    return "explore";
  }
  
  // 行动层：执行决策
  executeAction(
    agent: any,
    enemies: Map<string, any>,
    allies: Map<string, any>,
    loot: Map<string, any>,
    npcs: Map<string, any>
  ): { action: string; target: any; position?: { x: number; y: number } } {
    switch (this.currentDecision) {
      case "hunt": {
        const target = this.findBestEnemyTarget();
        if (target) {
          return {
            action: "attack",
            target: target,
            position: { x: target.x, y: target.y },
          };
        }
        return { action: "move", target: null, position: { x: agent.destX, y: agent.destY } };
      }
      
      case "flee": {
        const safePosition = this.calculateSafeRetreat(agent);
        return {
          action: "flee",
          target: null,
          position: safePosition,
        };
      }
      
      case "loot": {
        const nearestLoot = this.findNearestLoot();
        if (nearestLoot) {
          return {
            action: "collect_loot",
            target: nearestLoot,
            position: { x: nearestLoot.x, y: nearestLoot.y },
          };
        }
        return { action: "idle", target: null };
      }
      
      case "farm":
      case "explore": {
        const explorePosition = this.generateExplorationPoint(agent);
        return {
          action: "explore",
          target: null,
          position: explorePosition,
        };
      }
      
      case "guild_help": {
        const allyInDistress = this.findAllyNeedingHelp();
        if (allyInDistress) {
          return {
            action: "assist",
            target: allyInDistress,
            position: { x: allyInDistress.x, y: allyInDistress.y },
          };
        }
        return { action: "move", target: null, position: { x: agent.destX, y: agent.destY } };
      }
      
      case "defend": {
        return {
          action: "guard",
          target: null,
          position: { x: agent.x, y: agent.y },
        };
      }
      
      default: {
        return { action: "idle", target: null };
      }
    }
  }
  
  private findBestEnemyTarget(): any {
    if (this.perception.nearbyEnemies.length === 0) return null;
    
    // Prioritize weakest or most dangerous
    const sorted = [...this.perception.nearbyEnemies].sort((a, b) => 
      a.hpRatio - b.hpRatio || b.distance - a.distance
    );
    
    return sorted[0];
  }
  
  private calculateSafeRetreat(agent: any): { x: number; y: number } {
    // Move toward nearest portal or safe zone
    const portals = {
      dungeon: { x: 800, y: 100 },
      forest: { x: 1000, y: 100 },
      town: { x: 600, y: 1100 },
    };
    
    const safeSpot = portals[agent.map as keyof typeof portals] || { x: agent.x, y: agent.y };
    return {
      x: agent.x + (safeSpot.x - agent.x) * 0.3,
      y: agent.y + (safeSpot.y - agent.y) * 0.3,
    };
  }
  
  private findNearestLoot(): any {
    if (this.perception.nearbyLoot.length === 0) return null;
    
    return this.perception.nearbyLoot.reduce((nearest, item) => 
      item.amount && nearest.amount ? (item.amount > nearest.amount ? item : nearest) : item,
      this.perception.nearbyLoot[0]
    );
  }
  
  private generateExplorationPoint(agent: any): { x: number; y: number } {
    // Pick random point within map bounds
    const mapWidth = agent.map === "forest" ? 2000 : agent.map === "dungeon" ? 1600 : 1200;
    const mapHeight = mapWidth;
    
    return {
      x: Math.random() * (mapWidth - 100) + 50,
      y: Math.random() * (mapHeight - 100) + 50,
    };
  }
  
  private findAllyNeedingHelp(): any {
    return this.perception.nearbyAllies.find(ally => ally.hpRatio < 0.4 && !ally.isPlayer);
  }
  
  // Memory management
  recordExperience(experience: { type: "kill" | "death" | "loot" | "quest"; location?: { x: number; y: number; map: string }; details?: any }): void {
    if (experience.type === "death" && experience.location) {
      this.memory.dangerousZones.push(experience.location.map);
    }
    
    if ((experience.type === "loot" || experience.type === "kill") && experience.location) {
      this.memory.resourceLocations.push({
        x: experience.location.x,
        y: experience.location.y,
        type: experience.type === "kill" ? "xp" : "gold",
        discoveredAt: Date.now(),
      });
    }
    
    // Cleanup old memories
    const cutoff = Date.now() - 300000; // 5 minutes
    this.memory.resourceLocations = this.memory.resourceLocations.filter(m => m.discoveredAt > cutoff);
  }
  
  getMemorySnapshot(): AgentMemory {
    return { ...this.memory };
  }
}

// Factory for creating agents with different personalities
export function createAgent(personality: string = "farmer", name: string = "Agent", emoji: string = "🤖"): any {
  const brain = new AgentBrain(personality);
  
  return {
    brain,
    personality,
    name,
    emoji,
    state: "IDLE",
    aiState: "explore",
    lastDecision: null,
    memory: brain.getMemorySnapshot(),
  };
}

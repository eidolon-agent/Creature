// ─── Enhanced Game Engine Integration ─────────────────────────────────────
// Integrates AI agents, combat system, breeding, and particles

import { GameEngine } from './game-engine';
import { AgentBrain, createAgent, AIDecision } from './agent-brain';
import { 
  calculateElementMultiplier, 
  applyStatusEffect, 
  tickStatusEffects,
  SKILLS_DB,
  ElementType,
  StatusEffect 
} from './combat-system';
import { 
  Creature, 
  BreedingResult, 
  checkBreedingCompatibility, 
  breedCreatures,
  calculateBreedingCost,
  createDefaultGenes
} from './breeding-system';
import { 
  ParticleSystem, 
  globalParticleSystem,
  ParticleType 
} from './particle-system';

// Patch the existing GameEngine with enhanced features
export class EnhancedGameEngine extends GameEngine {
  private particleSystem: ParticleSystem;
  private agentBrains: Map<string, AgentBrain>;
  
  constructor() {
    super();
    this.particleSystem = new ParticleSystem();
    this.agentBrains = new Map();
  }
  
  // Override tick to include new systems
  tick(deltaTime: number) {
    super.tick(deltaTime);
    
    // Update particle system
    this.particleSystem.update(deltaTime);
    
    // Update AI agent brains
    this.updateAIBrains();
    
    // Update status effects
    this.updateStatusEffects();
    
    // Cleanup expired particles
    if (!this.particleSystem.hasActiveEffects()) {
      this.particleSystem.clear();
    }
  }
  
  // Enhanced combat with elements and skills
  executeCombat(
    attacker: any, 
    target: any, 
    skillId?: string, 
    element?: ElementType
  ): {
    damage: number;
    isCrit: boolean;
    elementMultiplier: number;
    statusEffect?: StatusEffect;
  } {
    const baseDamage = attacker.damage;
    
    // Calculate skill damage
    const skillMultiplier = skillId && SKILLS_DB[skillId] ? SKILLS_DB[skillId].power : 1.0;
    
    // Element effectiveness
    let elementMultiplier = 1.0;
    if (element) {
      // Simplified - would need target element from creature data
      elementMultiplier = 1.0;
    }
    
    // Critical hit chance
    const isCrit = Math.random() < 0.15;
    const critMultiplier = isCrit ? 1.5 : 1.0;
    
    // Final damage calculation
    const damage = Math.floor(
      baseDamage * skillMultiplier * elementMultiplier * critMultiplier
    );
    
    // Apply damage
    target.hp = Math.max(0, target.hp - damage);
    
    // Trigger particles
    this.particleSystem.createDamageEffect(target.x, target.y, isCrit);
    
    return {
      damage,
      isCrit,
      elementMultiplier,
    };
  }
  
  // Apply status effect to entity
  applyStatusEffect(
    target: any,
    effect: StatusEffect,
    potency: number,
    turns: number,
    sourceId: string
  ): void {
    const effectInstance = {
      effect,
      turnsRemaining: turns,
      potency,
      sourceId,
    };
    
    // @ts-ignore - target would have this array in full implementation
    if (!target.statusEffects) {
      // @ts-ignore
      target.statusEffects = [];
    }
    
    applyStatusEffect(target.statusEffects, effectInstance);
    
    // Visual feedback
    let particleType: ParticleType = "spark";
    if (effect === "burn") particleType = "fire";
    else if (effect === "freeze") particleType = "ice";
    else if (effect === "poison") particleType = "magic";
    else if (effect === "regen") particleType = "heal";
    else if (effect === "shield") particleType = "shield";
    
    this.particleSystem.createEmitter(target.x, target.y, particleType, 10, 50, 1.5);
  }
  
  // Update AI agent decision-making
  updateAIBrains(): void {
    for (const [agentId, agent] of this.agents.entries()) {
      let brain = this.agentBrains.get(agentId);
      
      if (!brain) {
        brain = new AgentBrain(agent.personality);
        this.agentBrains.set(agentId, brain);
      }
      
      // Update perception
      brain.updatePerception(
        Array.from(this.enemies.values()),
        Array.from(this.agents.values()).filter(a => a.id !== agentId),
        Array.from(this.loot.values()),
        [], // quests would come from NPCs
        { x: agent.x, y: agent.y, map: agent.map }
      );
      
      // Make decision
      const decision = brain.makeDecision();
      agent.aiState = decision;
      
      // Execute action
      const action = brain.executeAction(
        agent,
        this.enemies,
        this.agents,
        this.loot,
        this.npcs
      );
      
      // Update agent movement/behavior based on action
      this.applyAgentAction(agent, action);
    }
  }
  
  private applyAgentAction(agent: any, action: any): void {
    if (action.action === "attack" && action.target) {
      // Agent initiates combat
      this.executeCombat(agent, action.target);
    } else if (action.action === "move" && action.position) {
      agent.destX = action.position.x;
      agent.destY = action.position.y;
    } else if (action.action === "flee" && action.position) {
      agent.destX = action.position.x;
      agent.destY = action.position.y;
      // Apply speed boost
      agent.speed *= 1.3;
    } else if (action.action === "collect_loot" && action.target) {
      // Pick up loot
      agent.gold += action.target.amount;
    }
  }
  
  // Creature breeding system
  breedCreatures(parent1: Creature, parent2: Creature, tokens: number): BreedingResult {
    const cost = calculateBreedingCost(parent1, parent2);
    
    if (tokens < cost) {
      return {
        success: false,
        result: "failure",
        message: "Insufficient tokens for breeding",
        breedingCost: cost,
      };
    }
    
    return breedCreatures(parent1, parent2, cost);
  }
  
  // Create new creature from breeding
  createOffspring(parent1: Creature, parent2: Creature): Creature | null {
    const result = this.breedCreatures(parent1, parent2, 100);
    
    if (result.success && result.offspring) {
      // Initialize genes if not present
      if (!result.offspring.genes) {
        result.offspring.genes = createDefaultGenes(
          result.offspring.class,
          result.offspring.rarity
        );
      }
      
      // Create particle effect for breeding success
      const midX = (parent1.stats.hp + parent2.stats.hp) / 2; // Simplified position
      const midY = (parent1.stats.maxHp + parent2.stats.maxHp) / 2;
      this.particleSystem.createExplosion(midX, midY, 2);
      
      return result.offspring;
    }
    
    return null;
  }
  
  // Get active particle effects for rendering
  getActiveParticles(): any[] {
    return this.particleSystem.getParticles();
  }
  
  // Get emitters for debugging
  getParticleEmitters(): any[] {
    return this.particleSystem.getEmitters();
  }
  
  // Update status effects on all entities
  private updateStatusEffects(): void {
    const allEntities = [
      this.player,
      ...Array.from(this.agents.values()),
      ...Array.from(this.enemies.values()),
    ].filter(e => e !== null && e !== undefined);
    
    for (const entity of allEntities) {
      if (entity.statusEffects && entity.statusEffects.length > 0) {
        tickStatusEffects(entity, entity.statusEffects);
        
        // Remove dead entities
        if (entity.hp <= 0 && entity.type !== "enemy") {
          entity.isDead = true;
        }
      }
    }
  }
  
  // Use a skill in combat
  useSkill(
    caster: any,
    target: any,
    skillId: string,
    skillEffect?: ElementType
  ): {
    success: boolean;
    damage?: number;
    heal?: number;
    message: string;
  } {
    const skill = SKILLS_DB[skillId];
    if (!skill) {
      return {
        success: false,
        message: "Skill not found",
      };
    }
    
    // Check cooldown
    if (skill.cdRemaining && skill.cdRemaining > 0) {
      return {
        success: false,
        message: `Skill on cooldown: ${skill.cdRemaining}s`,
      };
    }
    
    // Skill type handling
    if (skill.type === "heal") {
      const healAmount = Math.floor(skill.power * caster.damage);
      target.hp = Math.min(target.hp + healAmount, target.maxHp);
      
      // Particle effect
      this.particleSystem.createHealEffect(target.x, target.y, healAmount);
      
      return {
        success: true,
        heal: healAmount,
        message: `Healed for ${healAmount} HP`,
      };
    } else if (skill.type === "buff" || skill.type === "debuff") {
      // Apply status effect
      const effect: StatusEffect = skill.type === "buff" ? "shield" : "curse";
      this.applyStatusEffect(target, effect, skill.power, skill.duration, caster.id);
      
      return {
        success: true,
        message: `Applied ${effect} to ${target.name}`,
      };
    } else {
      // Attack skill
      const result = this.executeCombat(caster, target, skillId, skillEffect);
      
      return {
        success: true,
        damage: result.damage,
        message: `Dealt ${result.damage} damage ${result.isCrit ? "(CRIT!)" : ""}`,
      };
    }
  }
}

// Export EnhancedGameEngine as default
export default EnhancedGameEngine;

// ─── Particle Effects System ──────────────────────────────────────────────
// Visual effects for combat, skills, and environmental feedback

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // seconds remaining
  maxLife: number;
  size: number;
  color: number; // hex color
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  type: ParticleType;
}

export type ParticleType = 
  | "explosion" 
  | "spark" 
  | "heal" 
  | "damage" 
  | "shield" 
  | "aura" 
  | "trail" 
  | "magic" 
  | "blood" 
  | "fire" 
  | "ice" 
  | "earth" 
  | "wind";

export interface ParticleEmitter {
  id: string;
  x: number;
  y: number;
  particleType: ParticleType;
  emissionRate: number; // particles per second
  maxParticles: number;
  duration: number; // seconds (0 = infinite)
  age: number;
  properties: Partial<ParticleConfig>;
}

export interface ParticleConfig {
  speedMin: number;
  speedMax: number;
  sizeMin: number;
  sizeMax: number;
  lifeMin: number;
  lifeMax: number;
  colorStart: number;
  colorEnd: number;
  alphaStart: number;
  alphaEnd: number;
  gravity: number;
  drag: number;
 spreadAngle: number;
}

// Preset configurations for different effect types
export const PARTICLE_PRESETS: Record<ParticleType, Partial<ParticleConfig>> = {
  explosion: {
    speedMin: 100,
    speedMax: 300,
    sizeMin: 5,
    sizeMax: 15,
    lifeMin: 0.5,
    lifeMax: 1.0,
    colorStart: 0xff6600,
    colorEnd: 0xff0000,
    alphaStart: 1.0,
    alphaEnd: 0.0,
    gravity: 0,
    drag: 0.95,
    spreadAngle: 360,
  },
  spark: {
    speedMin: 200,
    speedMax: 400,
    sizeMin: 2,
    sizeMax: 5,
    lifeMin: 0.2,
    lifeMax: 0.5,
    colorStart: 0xffff00,
    colorEnd: 0xffaa00,
    alphaStart: 1.0,
    alphaEnd: 0.0,
    gravity: -200,
    drag: 0.9,
    spreadAngle: 180,
  },
  heal: {
    speedMin: 50,
    speedMax: 100,
    sizeMin: 8,
    sizeMax: 15,
    lifeMin: 1.0,
    lifeMax: 2.0,
    colorStart: 0x00ff00,
    colorEnd: 0x00ffaa,
    alphaStart: 0.8,
    alphaEnd: 0.0,
    gravity: 50,
    drag: 0.98,
    spreadAngle: 360,
  },
  damage: {
    speedMin: 30,
    sizeMax: 12,
    sizeMin: 8,
    lifeMin: 0.8,
    lifeMax: 1.5,
    colorStart: 0xff0000,
    colorEnd: 0xaa0000,
    alphaStart: 1.0,
    alphaEnd: 0.5,
    gravity: 0,
    drag: 1.0,
    spreadAngle: 360,
  },
  shield: {
    speedMin: 0,
    speedMax: 20,
    sizeMin: 20,
    sizeMax: 40,
    lifeMin: 2.0,
    lifeMax: 4.0,
    colorStart: 0x00aaff,
    colorEnd: 0x00ffff,
    alphaStart: 0.5,
    alphaEnd: 0.0,
    gravity: 0,
    drag: 0.99,
    spreadAngle: 360,
  },
  aura: {
    speedMin: 10,
    speedMax: 30,
    sizeMin: 15,
    sizeMax: 30,
    lifeMin: 1.0,
    lifeMax: 2.0,
    colorStart: 0xffd700,
    colorEnd: 0xffa500,
    alphaStart: 0.3,
    alphaEnd: 0.6,
    gravity: 0,
    drag: 0.97,
    spreadAngle: 360,
  },
  trail: {
    speedMin: 0,
    speedMax: 0,
    sizeMin: 4,
    sizeMax: 8,
    lifeMin: 0.3,
    lifeMax: 0.6,
    colorStart: 0xffffff,
    colorEnd: 0xaaaaaa,
    alphaStart: 0.6,
    alphaEnd: 0.0,
    gravity: 0,
    drag: 0.95,
    spreadAngle: 60,
  },
  magic: {
    speedMin: 80,
    speedMax: 150,
    sizeMin: 6,
    sizeMax: 12,
    lifeMin: 1.5,
    lifeMax: 2.5,
    colorStart: 0xaa00ff,
    colorEnd: 0x00ffff,
    alphaStart: 0.9,
    alphaEnd: 0.2,
    gravity: -30,
    drag: 0.96,
    spreadAngle: 360,
  },
  blood: {
    speedMin: 100,
    speedMax: 200,
    sizeMin: 3,
    sizeMax: 6,
    lifeMin: 0.5,
    lifeMax: 1.0,
    colorStart: 0x880000,
    colorEnd: 0x440000,
    alphaStart: 1.0,
    alphaEnd: 0.8,
    gravity: 300,
    drag: 0.9,
    spreadAngle: 180,
  },
  fire: {
    speedMin: 50,
    speedMax: 150,
    sizeMin: 10,
    sizeMax: 25,
    lifeMin: 0.8,
    lifeMax: 1.5,
    colorStart: 0xff4400,
    colorEnd: 0xffaa00,
    alphaStart: 0.9,
    alphaEnd: 0.0,
    gravity: -100,
    drag: 0.94,
    spreadAngle: 120,
  },
  ice: {
    speedMin: 60,
    speedMax: 120,
    sizeMin: 6,
    sizeMax: 14,
    lifeMin: 1.0,
    lifeMax: 1.8,
    colorStart: 0x00aaff,
    colorEnd: 0x00ffff,
    alphaStart: 0.8,
    alphaEnd: 0.1,
    gravity: -50,
    drag: 0.97,
    spreadAngle: 180,
  },
  earth: {
    speedMin: 40,
    speedMax: 100,
    sizeMin: 8,
    sizeMax: 18,
    lifeMin: 0.6,
    lifeMax: 1.2,
    colorStart: 0x8b4513,
    colorEnd:  0x5d2906,
    alphaStart: 1.0,
    alphaEnd: 0.5,
    gravity: 200,
    drag: 0.92,
    spreadAngle: 240,
  },
  wind: {
    speedMin: 150,
    speedMax: 300,
    sizeMin: 5,
    sizeMax: 10,
    lifeMin: 0.4,
    lifeMax: 0.8,
    colorStart: 0xffffff,
    colorEnd: 0xcccccc,
    alphaStart: 0.7,
    alphaEnd: 0.0,
    gravity: 0,
    drag: 0.98,
    spreadAngle: 360,
  },
};

// Particle system management
export class ParticleSystem {
  private particles: Particle[] = [];
  private emitters: ParticleEmitter[] = [];
  private nextParticleId: number = 0;
  private nextEmitterId: number = 0;
  
  // Update all particles and emitters
  update(deltaTime: number): void {
    // Update emitters
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const emitter = this.emitters[i];
      emitter.age += deltaTime;
      
      // Emit new particles
      const emissionInterval = 1 / emitter.emissionRate;
      while (emitter.age - (emitter.duration > 0 ? emitter.age : 0) >= emissionInterval) {
        if (this.particles.length < emitter.maxParticles) {
          this.emitParticle(emitter);
        }
        emitter.age -= emissionInterval;
      }
      
      // Remove expired emitters
      if (emitter.duration > 0 && emitter.age >= emitter.duration) {
        this.emitters.splice(i, 1);
      }
    }
    
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Update life
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // Update position
      const config = this.getParticleConfig(p.type);
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      
      // Apply forces
      p.vy += config.gravity * deltaTime;
      p.vx *= config.drag;
      p.vy *= config.drag;
      
      // Update rotation
      p.rotation += p.rotationSpeed * deltaTime;
      
      // Fade out
      const lifeRatio = p.life / p.maxLife;
      p.alpha = config.alphaStart * lifeRatio + config.alphaEnd * (1 - lifeRatio);
      p.size = config.sizeMin + (config.sizeMax - config.sizeMin) * (1 - lifeRatio);
    }
  }
  
  private getParticleConfig(type: ParticleType): ParticleConfig {
    const preset = PARTICLE_PRESETS[type] || PARTICLE_PRESETS.spark;
    return {
      speedMin: preset.speedMin || 50,
      speedMax: preset.speedMax || 100,
      sizeMin: preset.sizeMin || 5,
      sizeMax: preset.sizeMax || 10,
      lifeMin: preset.lifeMin || 0.5,
      lifeMax: preset.lifeMax || 1.0,
      colorStart: preset.colorStart || 0xffffff,
      colorEnd: preset.colorEnd || 0xaaaaaa,
      alphaStart: preset.alphaStart || 1.0,
      alphaEnd: preset.alphaEnd || 0.0,
      gravity: preset.gravity || 0,
      drag: preset.drag || 0.98,
      spreadAngle: preset.spreadAngle || 360,
    };
  }
  
  private emitParticle(emitter: ParticleEmitter): void {
    const config = this.getParticleConfig(emitter.particleType);
    const angle = (Math.random() - 0.5) * (emitter.properties.spreadAngle || config.spreadAngle) * (Math.PI / 180);
    const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin);
    
    const particle: Particle = {
      id: `p_${this.nextParticleId++}`,
      x: emitter.x,
      y: emitter.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: config.lifeMin + Math.random() * (config.lifeMax - config.lifeMin),
      maxLife: config.lifeMax,
      size: config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin),
      color: config.colorStart,
      alpha: config.alphaStart,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 4,
      type: emitter.particleType,
    };
    
    this.particles.push(particle);
  }
  
  // Create a new emitter
  createEmitter(
    x: number,
    y: number,
    particleType: ParticleType,
    emissionRate: number = 10,
    maxParticles: number = 100,
    duration: number = 0
  ): string {
    const emitter: ParticleEmitter = {
      id: `e_${this.nextEmitterId++}`,
      x,
      y,
      particleType,
      emissionRate,
      maxParticles,
      duration,
      age: 0,
      properties: {},
    };
    
    this.emitters.push(emitter);
    return emitter.id;
  }
  
  // Quick effect creation
  createExplosion(x: number, y: number, size: number = 1): void {
    this.createEmitter(x, y, "explosion", 50 * size, 200 * size, 0.5 * size);
  }
  
  createHealEffect(x: number, y: number, amount: number): void {
    this.createEmitter(x, y, "heal", 20, 50, 1.5);
    // Also create floating text (handled separately in game engine)
  }
  
  createDamageEffect(x: number, y: number, isCrit: boolean): void {
    if (isCrit) {
      this.createEmitter(x, y, "explosion", 30, 100, 0.3);
    }
    this.createEmitter(x, y, "damage", 15, 30, 1.0);
  }
  
  createShieldEffect(x: number, y: number): void {
    this.createEmitter(x, y, "shield", 10, 100, 2.0);
  }
  
  createAuraEffect(x: number, y: number, color?: number): void {
    this.createEmitter(x, y, "aura", 5, 200, 0); // Infinite duration
  }
  
  createMagicImpact(x: number, y: number, element: "fire" | "water" | "earth" | "air" | "dark" | "light"): void {
    const typeMap: Record<string, ParticleType> = {
      fire: "fire",
      water: "ice",
      earth: "earth",
      air: "wind",
      dark: "magic",
      light: "heal",
    };
    
    const type = typeMap[element] || "magic";
    this.createEmitter(x, y, type, 30, 100, 1.0);
  }
  
  createTrailEffect(x: number, y: number): void {
    this.createEmitter(x, y, "trail", 20, 30, 0.3);
  }
  
  // Get all particles for rendering
  getParticles(): Particle[] {
    return [...this.particles];
  }
  
  // Get all emitters for debugging
  getEmitters(): ParticleEmitter[] {
    return [...this.emitters];
  }
  
  // Clear all particles and emitters
  clear(): void {
    this.particles = [];
    this.emitters = [];
  }
  
  // Check if system has active effects
  hasActiveEffects(): boolean {
    return this.particles.length > 0 || this.emitters.length > 0;
  }
}

// Singleton instance for global particle effects
export const globalParticleSystem = new ParticleSystem();

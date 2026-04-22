# CreatureQuest Rebranding & HD Assets Plan

## 🎨 Overview
Transforming CreatureQuest from Ragnarok-inspired MMO into a unique Web3 MMORPG with original lore, custom creature names, and HD pixel-art assets.

---

## 🏰 Zone Renaming

| Original | New Name | Theme | Description |
|----------|----------|-------|-------------|
| **Prontera** | **Crystal Haven** | Peaceful Town | Safe zone with glowing crystal spires, where players start and trade |
| **Payon Forest** | **Whispering Woods** | Mystical Forest | Ancient trees with bioluminescent plants, home to gentle creatures |
| **Glast Heim** | **Shadowfall深渊** | Dark Dungeon | Corrupted ruins of a fallen empire, PvP zone with void creatures |
| **Morroc Desert** | **Sunscorched Expanse** | Harsh Desert | Treacherous dunes with ancient tombs and fire elementals |

---

## 👹 Monster Renaming

### Forest Zone (Whispering Woods)
| Original | New Name | Type | Stats | Lore |
|----------|----------|------|-------|------|
| **Poring** | **Glimmerblob** | Slime | HP:50 ATK:8 | Translucent crystalline slime that absorbs moonlight |
| **Lunatic** | **Mooncap Sprout** | Plant | HP:80 ATK:14 | Wild mushroom creature that dances under lunar cycles |
| **Zombie** | **Rotwood Stalker** | Undead | HP:150 ATK:22 | Tree-spirited undead that guard ancient groves |
| **Skeleton** | **Bonebranch Reaver** | Skeleton | HP:220 ATK:38 | Cracked bone warriors fused with dead branches |

### Dungeon Zone (Shadowfall)
| Original | New Name | Type | Stats | Lore |
|----------|----------|------|-------|------|
| **Drake** | **Voidwing Serpent** | Dragon | HP:480 ATK:75 | Dimensional serpent corrupted by void energy |
| **Baphomet** | **Nethervoid Titan** | Boss | HP:3500 ATK:180 | Ancient entity from the abyss, leader of shadow forces |

### Desert Zone (Sunscorched)
| New Names |
|-----------|
| **Duneslime** (pink/orange) |
| **Scorpid Magma** (lava creature) |
| **Sand Wraith** (transparent ghost) |
| **Pyre Elemental** (fire spirit) |

---

## 🎭 Player Classes (Retained with Flavor)

| Class | New Name | Description | HD Visual Style |
|-------|----------|-------------|-----------------|
| **Warrior** | **Crystal Guard** | Heavy armor, high HP | Polished steel with glowing blue crystals embedded, dynamic cape |
| **Mage** | **Arcane Weaver** | Burst damage, magic | Robes with floating runes, staff that pulses with energy |
| **Rogue** | **Shadow Striker** | High crit, evasion | Sleek black leather with purple accents, dual daggers |
| **Healer** | **Life Tender** | Self-heal, balanced | White/gold robes with nature motifs, healing aura particles |

---

## 🖼️ HD Asset Enhancements

### Current Assets (32x32)
- Simple color blocks
- Basic outlines
- 2-frame animation

### New HD Assets (64x64 or 128x128)

#### **1. Procedural HD Sprites**
```typescript
// Features to add:
- Gradient fills (4-6 color blends per sprite)
- Multi-layer detailing (base, highlights, shadows, glow)
- Particle effects on special abilities
- Dynamic animation frames (8+ frames for fluid motion)
- Specular highlights on armor/crystals
- Glowing eyes with pupil animation
- Texture overlays (fabric weave, metal scratches)
```

#### **2. Zone-Specific Palettes**

**Crystal Haven:**
- Primary: `#E8F4F8` (icy blue)
- Accent: `#7FD8E8` (glowing crystal)
- Outline: `#2C3E50` (deep shadow)
- Glow: `#FFFFFF` with soft blur

**Whispering Woods:**
- Primary: `#4A7C59` (forest green)
- Accent: `#B8E6D5` (bioluminescent)
- Outline: `#1A3D2F` (dark foliage)
- Glow: `#A8FFD8` (soft light)

**Shadowfall:**
- Primary: `#1A1A2E` (void purple)
- Accent: `#8B4789` (corrupted energy)
- Outline: `#000000` (pure darkness)
- Glow: `#FF3366` (danger red)

**Sunscorched:**
- Primary: `#D4A574` (sand gold)
- Accent: `#FF6B35` (magma)
- Outline: `#4A2C17` (deep shadow)
- Glow: `#FFB347` (sun flare)

#### **3. Creature HD Upgrades**

**Glimmerblob (was Poring):**
```
- 64x64 transparent crystalline body
- Internal light refraction effect
- Pulsing core with color shift (blue→purple)
- Subtle bouncing animation (3 frames)
- Particles: tiny crystal shards when moving
```

**Voidwing Serpent (was Drake):**
```
- 128x128 serpentine body with 8 segments
- Iridescent scales (holographic texture)
- Glowing eyes with shockwave effect
- Wing membrane transparent with purple veins
- Idle breath: smoke rings
```

**Nethervoid Titan (was Baphomet):**
```
- 256x256 boss model
- Multiple layers: main body, floating orbs, aura
- Eyes: rotating spiral patterns
- Body: crackling void energy
- Special: screen shake on damage
- Animation: 12 frames for boss attack
```

---

## 🎨 New Procedural Sprite Engine

### File: `src/features/game/engine/hd-sprite-renderer.ts`

```typescript
// Advanced features:
class HDSpriteRenderer {
  // Layer-based rendering
  drawBaseLayer(ctx, creature)
  drawDetailLayer(ctx, creature)
  drawGlowLayer(ctx, creature)
  drawParticleLayer(ctx, creature)
  
  // Dynamic effects
  applyShadows(creature, lightSource)
  applySpecular(creature, angle)
  applyPulse(creature, speed)
  applyRotation(creature, frame)
  
  // Animation system
  createAnimationFrame(creature, frameIndex)
  interpolateFrame(creature, progress)
  blendAnimation(creature, state)
}
```

### Features to Implement:
1. **Multi-pass rendering** (base → details → glow → particles)
2. **Procedural gradients** (radial, linear, conic)
3. **Texture generation** (noise, patterns, overlays)
4. **Dynamic lighting** (spot, ambient, directional)
5. **Particle systems** (13 types: fire, ice, void, nature, etc.)
6. **Screen-space effects** (bloom, chromatic aberration, depth)

---

## 📝 Implementation Plan

### Phase 1: Zone Renaming
- [ ] Update `types.ts` zone definitions
- [ ] Change all UI labels ("Prontera" → "Crystal Haven")
- [ ] Update warp menu and minimap
- [ ] Change zone ambience labels

### Phase 2: Creature Renaming
- [ ] Update `MONSTER_DEFS` in `types.ts`
- [ ] Change spawn names in MMO server
- [ ] Update creature database
- [ ] Change loot/reward names

### Phase 3: HD Asset Pipeline
- [ ] Create new `hd-sprite-renderer.ts`
- [ ] Upgrade creature sprites to 64x64/128x128
- [ ] Add gradient fills and glows
- [ ] Implement particle effects
- [ ] Create zone-specific tilesets

### Phase 4: Visual Polish
- [ ] Add shader-like post-processing
- [ ] Implement dynamic lighting
- [ ] Create breathing/idle animations
- [ ] Add combat visual effects
- [ ] Enhance UI with HD graphics

---

## 🎯 Quick Wins (Immediate Changes)

### 1. Rename All Zones
```typescript
// File: src/features/mmo/types.ts
export type ZoneId = "crystal_haven" | "whispering_woods" | "shadowfall" | "sunscorched";

ZONE_DEFS:
  crystal_haven: { id: "crystal_haven", name: "Crystal Haven", ... }
  whispering_woods: { id: "whispering_woods", name: "Whispering Woods", ... }
  shadowfall: { id: "shadowfall", name: "Shadowfall", ... }
  sunscorched: { id: "sunscorched", name: "Sunscorched Expanse", ... }
```

### 2. Rename Monsters
```typescript
MONSTER_DEFS:
  glimmerblob: { name: "Glimmerblob", ... }
  mooncap: { name: "Mooncap Sprout", ... }
  rotwood: { name: "Rotwood Stalker", ... }
  voidwing: { name: "Voidwing Serpent", ... }
  nethervoid: { name: "Nethervoid Titan", ... }
```

### 3. Add HD Visual Enhancements
In `sprite-renderer.ts`:
- Add gradient backgrounds to creatures
- Increase sprite size from 32x32 → 48x48
- Add glow effects to eyes/weapons
- Create 8-frame animations instead of 2

### 4. Update UI Labels
- Warp menu: "Pront" → "Crystal Haven"
- Zone text: "Prontera" → "Crystal Haven"
- Combat log: "Poring" → "Glimmerblob"

---

## 🔮 Future Vision

- **Seasonal Events**: Halloween forest, Winter crystal, Summer desert
- **Creature Breeding**: Mix colors/species for unique hybrids
- **Dynamic Weather**: Rain, fog, sandstorm affecting visuals
- **Guild Halls**: Customizable player bases with unique decor
- **Boss Raids**: Multi-phase encounters with elaborate visuals

---

## 📦 Assets to Generate

### Sprites (100+ needed)
- 4 zones × 25 tiles each = 100 tile sprites
- 8 creature types × 8 animation frames = 64 creature sprites
- 4 player classes × 6 animation frames = 24 player sprites
- 15 particle effects × 10 frames = 150 particle sprites

### UI Elements
- 20 buttons (upgrade icons, borders, backgrounds)
- 15 frames (portrait, inventory, dialog boxes)
- 10 icons (skills, items, currency)

---

**Ready to execute!** Let me know if you want me to:
1. Start with zone/creature renames (quick, text-only)
2. Build the HD sprite engine first (visual impact immediately)
3. Create a sample HD creature to preview the style

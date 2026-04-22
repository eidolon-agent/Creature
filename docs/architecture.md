# CreatureQuest — Full System Architecture

> Web3 MMORPG with AI Agents, NFT Creatures, and Player-Driven Economy

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CREATUREQUEST                            │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   FRONTEND   │    │   BACKEND    │    │   BLOCKCHAIN     │  │
│  │              │    │              │    │                  │  │
│  │ Next.js/     │◄──►│ Node.js +    │◄──►│ Base / Polygon   │  │
│  │ Phaser 3     │    │ WebSocket    │    │                  │  │
│  │              │    │              │    │ ERC-721 NFTs     │  │
│  │ wagmi/viem   │    │ Redis State  │    │ ERC-20 Token     │  │
│  │              │    │              │    │ Breeding         │  │
│  └──────────────┘    │ Tick Loop    │    │ Marketplace      │  │
│                      │ AI Agents    │    └──────────────────┘  │
│                      └──────────────┘                          │
│                              │                                  │
│                      ┌───────▼──────┐                          │
│                      │   DATABASE   │                          │
│                      │              │                          │
│                      │ PostgreSQL   │                          │
│                      │ (game data)  │                          │
│                      │              │                          │
│                      │ IPFS/Arweave │                          │
│                      │ (NFT meta)   │                          │
│                      └──────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Folder Structure

```
creaturequest/
├── packages/
│   ├── contracts/              # Solidity smart contracts
│   │   ├── src/
│   │   │   ├── CreatureNFT.sol
│   │   │   ├── QuestToken.sol
│   │   │   ├── BreedingSystem.sol
│   │   │   ├── Marketplace.sol
│   │   │   └── AgentRegistry.sol
│   │   ├── scripts/
│   │   │   ├── deploy.ts
│   │   │   └── verify.ts
│   │   ├── test/
│   │   └── hardhat.config.ts
│   │
│   ├── backend/                # Node.js game server
│   │   ├── src/
│   │   │   ├── agents/
│   │   │   │   ├── agent-manager.ts
│   │   │   │   ├── agent-brain.ts
│   │   │   │   ├── agent-reflex.ts
│   │   │   │   ├── agent-strategy.ts
│   │   │   │   └── agent-memory.ts
│   │   │   ├── combat/
│   │   │   │   ├── combat-engine.ts
│   │   │   │   ├── damage-calculator.ts
│   │   │   │   └── skill-resolver.ts
│   │   │   ├── world/
│   │   │   │   ├── zone-manager.ts
│   │   │   │   ├── enemy-spawner.ts
│   │   │   │   └── loot-table.ts
│   │   │   ├── economy/
│   │   │   │   ├── token-emission.ts
│   │   │   │   └── marketplace-engine.ts
│   │   │   ├── network/
│   │   │   │   ├── ws-server.ts
│   │   │   │   └── message-broker.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.ts
│   │   │   │   └── queries.ts
│   │   │   ├── tick/
│   │   │   │   └── tick-loop.ts
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── frontend/               # React/Next.js + Phaser
│   │   ├── src/
│   │   │   ├── game/
│   │   │   │   ├── scenes/
│   │   │   │   │   ├── MainScene.ts
│   │   │   │   │   ├── ForestScene.ts
│   │   │   │   │   └── TownScene.ts
│   │   │   │   ├── entities/
│   │   │   │   │   ├── Player.ts
│   │   │   │   │   ├── Creature.ts
│   │   │   │   │   ├── Enemy.ts
│   │   │   │   │   └── AgentEntity.ts
│   │   │   │   ├── systems/
│   │   │   │   │   ├── CombatSystem.ts
│   │   │   │   │   └── PathfindingSystem.ts
│   │   │   │   └── config/
│   │   │   │       └── phaser.config.ts
│   │   │   ├── ui/
│   │   │   │   ├── HUD.tsx
│   │   │   │   ├── Inventory.tsx
│   │   │   │   └── Marketplace.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useWebSocket.ts
│   │   │   │   ├── useCreatures.ts
│   │   │   │   └── useAgent.ts
│   │   │   └── web3/
│   │   │       ├── wagmi.config.ts
│   │   │       └── contracts.ts
│   │   └── package.json
│   │
│   └── shared/                 # Shared types/utils
│       ├── src/
│       │   ├── types/
│       │   │   ├── creature.ts
│       │   │   ├── agent.ts
│       │   │   ├── combat.ts
│       │   │   ├── economy.ts
│       │   │   └── messages.ts
│       │   └── constants/
│       │       ├── zones.ts
│       │       └── skills.ts
│       └── package.json
│
├── docker-compose.yml
├── turbo.json
└── package.json
```

---

## 3. Smart Contracts

### 3.1 CreatureNFT.sol (ERC-721)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CreatureNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    enum CreatureClass { BEAST, PLANT, AQUA, BUG, REPTILE }
    enum Rarity { COMMON, RARE, EPIC, LEGENDARY }

    struct CreatureStats {
        uint16 hp;
        uint16 attack;
        uint16 speed;
        uint16 defense;
    }

    struct CreatureParts {
        uint8 body;       // 0-31 = different body types
        uint8 head;
        uint8 tail;
        uint8 horn;
        uint8 wings;      // 0 = no wings
    }

    struct CreatureGenes {
        bytes32 dominantGenes;
        bytes32 recessiveGenes;
        uint8 breedCount;
        uint256 lastBreedTime;
    }

    struct Creature {
        CreatureClass class;
        Rarity rarity;
        CreatureStats stats;
        CreatureParts parts;
        CreatureGenes genes;
        uint8 level;
        uint256 exp;
        bool isEvolved;
    }

    mapping(uint256 => Creature) public creatures;
    mapping(uint256 => bool) public breedingCooldown;

    uint256 public constant MAX_BREED_COUNT = 7;
    uint256 public constant BREED_COOLDOWN = 5 days;

    event CreatureMinted(uint256 indexed tokenId, address indexed owner, CreatureClass class);
    event CreatureLevelUp(uint256 indexed tokenId, uint8 newLevel);
    event CreatureEvolved(uint256 indexed tokenId);

    constructor() ERC721("CreatureQuest", "CQ") Ownable(msg.sender) {}

    function mint(
        address to,
        CreatureClass class,
        CreatureParts memory parts,
        bytes32 genes,
        string memory tokenURI
    ) external onlyOwner returns (uint256) {
        _tokenIds.increment();
        uint256 newId = _tokenIds.current();

        creatures[newId] = Creature({
            class: class,
            rarity: _computeRarity(genes),
            stats: _baseStats(class),
            parts: parts,
            genes: CreatureGenes({
                dominantGenes: genes,
                recessiveGenes: bytes32(0),
                breedCount: 0,
                lastBreedTime: 0
            }),
            level: 1,
            exp: 0,
            isEvolved: false
        });

        _safeMint(to, newId);
        _setTokenURI(newId, tokenURI);

        emit CreatureMinted(newId, to, class);
        return newId;
    }

    function addExp(uint256 tokenId, uint256 expGain) external onlyOwner {
        Creature storage c = creatures[tokenId];
        c.exp += expGain;
        uint8 newLevel = uint8(sqrt(c.exp / 100));
        if (newLevel > c.level) {
            c.level = newLevel;
            _applyLevelBonus(c);
            emit CreatureLevelUp(tokenId, newLevel);
        }
    }

    // --- Internal helpers ---

    function _computeRarity(bytes32 genes) internal pure returns (Rarity) {
        uint256 hash = uint256(genes);
        uint256 roll = hash % 1000;
        if (roll < 5) return Rarity.LEGENDARY;
        if (roll < 50) return Rarity.EPIC;
        if (roll < 200) return Rarity.RARE;
        return Rarity.COMMON;
    }

    function _baseStats(CreatureClass class) internal pure returns (CreatureStats memory) {
        if (class == CreatureClass.BEAST)  return CreatureStats(800, 100, 70, 60);
        if (class == CreatureClass.PLANT)  return CreatureStats(1000, 60, 50, 90);
        if (class == CreatureClass.AQUA)   return CreatureStats(700, 80, 110, 50);
        if (class == CreatureClass.BUG)    return CreatureStats(600, 120, 100, 40);
        /* REPTILE */                      return CreatureStats(900, 70, 60, 80);
    }

    function _applyLevelBonus(Creature storage c) internal {
        uint16 bonus = uint16(c.level) * 5;
        c.stats.hp += bonus * 2;
        c.stats.attack += bonus;
        c.stats.defense += bonus;
        c.stats.speed += bonus;
    }

    function sqrt(uint256 x) internal pure returns (uint8) {
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) { y = z; z = (x / z + z) / 2; }
        return y > 99 ? 99 : uint8(y);
    }

    // Required overrides
    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
```

### 3.2 QuestToken.sol (ERC-20)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract QuestToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 public dailyEmissionCap = 10_000 * 10**18;           // 10k/day
    uint256 public lastEmissionReset;
    uint256 public todayEmitted;

    event DailyCapUpdated(uint256 newCap);

    constructor() ERC20("QuestToken", "QUEST") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        lastEmissionReset = block.timestamp;
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _resetDailyEmission();
        require(todayEmitted + amount <= dailyEmissionCap, "Daily cap reached");
        todayEmitted += amount;
        _mint(to, amount);
    }

    function _resetDailyEmission() internal {
        if (block.timestamp >= lastEmissionReset + 1 days) {
            todayEmitted = 0;
            lastEmissionReset = block.timestamp;
        }
    }

    function setDailyEmissionCap(uint256 newCap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        dailyEmissionCap = newCap;
        emit DailyCapUpdated(newCap);
    }
}
```

### 3.3 BreedingSystem.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CreatureNFT.sol";
import "./QuestToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BreedingSystem is Ownable {
    CreatureNFT public creatureNFT;
    QuestToken public questToken;

    uint256 public breedingCost = 1000 * 10**18; // 1000 QUEST tokens
    uint256 public constant BREED_COOLDOWN = 5 days;
    uint256 public constant MAX_BREEDS = 7;
    uint256 public constant MUTATION_CHANCE = 50; // 5% (out of 1000)

    struct BreedRequest {
        uint256 parent1;
        uint256 parent2;
        address requester;
        uint256 requestTime;
        bool fulfilled;
    }

    mapping(uint256 => BreedRequest) public breedRequests;
    uint256 public breedRequestCount;

    event BreedRequested(uint256 indexed requestId, uint256 parent1, uint256 parent2);
    event BreedFulfilled(uint256 indexed requestId, uint256 offspringId);

    constructor(address _nft, address _token) Ownable(msg.sender) {
        creatureNFT = CreatureNFT(_nft);
        questToken = QuestToken(_token);
    }

    function requestBreed(uint256 parent1Id, uint256 parent2Id) external {
        require(creatureNFT.ownerOf(parent1Id) == msg.sender, "Not owner of parent1");
        require(creatureNFT.ownerOf(parent2Id) == msg.sender, "Not owner of parent2");
        require(parent1Id != parent2Id, "Cannot self-breed");

        CreatureNFT.Creature memory p1 = creatureNFT.creatures(parent1Id);
        CreatureNFT.Creature memory p2 = creatureNFT.creatures(parent2Id);

        require(p1.genes.breedCount < MAX_BREEDS, "Parent1 max breeds reached");
        require(p2.genes.breedCount < MAX_BREEDS, "Parent2 max breeds reached");
        require(
            block.timestamp >= p1.genes.lastBreedTime + BREED_COOLDOWN,
            "Parent1 on cooldown"
        );
        require(
            block.timestamp >= p2.genes.lastBreedTime + BREED_COOLDOWN,
            "Parent2 on cooldown"
        );

        // Burn tokens (anti-inflation)
        questToken.burnFrom(msg.sender, breedingCost);

        breedRequestCount++;
        breedRequests[breedRequestCount] = BreedRequest({
            parent1: parent1Id,
            parent2: parent2Id,
            requester: msg.sender,
            requestTime: block.timestamp,
            fulfilled: false
        });

        emit BreedRequested(breedRequestCount, parent1Id, parent2Id);
    }

    // Called by backend oracle after computing offspring genes off-chain
    function fulfillBreed(
        uint256 requestId,
        CreatureNFT.CreatureParts memory offspringParts,
        bytes32 offspringGenes,
        string memory tokenURI
    ) external onlyOwner {
        BreedRequest storage req = breedRequests[requestId];
        require(!req.fulfilled, "Already fulfilled");
        req.fulfilled = true;

        CreatureNFT.Creature memory p1 = creatureNFT.creatures(req.parent1);

        uint256 offspringId = creatureNFT.mint(
            req.requester,
            p1.class, // class inherited from dominant parent
            offspringParts,
            offspringGenes,
            tokenURI
        );

        emit BreedFulfilled(requestId, offspringId);
    }
}
```

---

## 4. AI Agent System

### 4.1 Agent Data Model

```typescript
// packages/shared/src/types/agent.ts

export type AgentState = "idle" | "moving" | "attacking" | "looting" | "fleeing" | "dead";
export type AgentStrategy = "farming" | "hunting" | "exploring" | "trading";

export interface AgentPersonality {
  aggression: number;      // 0-100: willingness to engage enemies
  greed: number;           // 0-100: prioritizes loot over safety
  riskTolerance: number;   // 0-100: willingness to fight stronger enemies
  loyalty: number;         // 0-100: stays near owner's last position
}

export interface AgentMemory {
  visitedZones: string[];
  bestLootZone: string | null;
  dangerousEnemies: string[];  // enemy types that killed this agent
  profitHistory: number[];      // last 10 session profits
  totalTokensEarned: number;
  totalBattlesWon: number;
  totalBattlesLost: number;
}

export interface Agent {
  id: string;
  owner: string;           // wallet address
  creatureId: string;      // NFT token ID
  state: AgentState;
  strategy: AgentStrategy;
  personality: AgentPersonality;
  memory: AgentMemory;
  position: { x: number; y: number };
  currentZone: string;
  target: string | null;   // enemy ID or resource ID
  behaviorHash: string;    // IPFS hash of behavior config
  lastTickTime: number;
  isActive: boolean;
}
```

### 4.2 Agent Brain (3-Layer Architecture)

```typescript
// packages/backend/src/agents/agent-brain.ts

import { Agent, AgentState } from "@shared/types/agent";
import { ZoneState, Enemy, Resource } from "@shared/types/world";
import { AgentReflex } from "./agent-reflex";
import { AgentStrategy } from "./agent-strategy";
import { AgentMemory } from "./agent-memory";

export class AgentBrain {
  private reflex: AgentReflex;
  private strategy: AgentStrategyLayer;
  private memory: AgentMemoryLayer;

  constructor(private agent: Agent) {
    this.reflex = new AgentReflex(agent);
    this.strategy = new AgentStrategyLayer(agent);
    this.memory = new AgentMemoryLayer(agent);
  }

  /**
   * Main agent tick — Observe → Decide → Act → Learn
   */
  tick(zoneState: ZoneState): AgentAction {
    // 1. OBSERVE: gather environment data
    const observation = this.observe(zoneState);

    // 2. REFLEX CHECK: immediate reactions (highest priority)
    const reflexAction = this.reflex.check(observation);
    if (reflexAction) return reflexAction;

    // 3. STRATEGY DECISION: higher-level goal selection
    const strategicAction = this.strategy.decide(observation);

    // 4. LEARN: update memory after tick
    this.memory.update(observation, strategicAction);

    return strategicAction;
  }

  private observe(zoneState: ZoneState): Observation {
    const creature = zoneState.creatures[this.agent.creatureId];
    const nearbyEnemies = this.getNearbyEnemies(zoneState, 3); // 3-tile radius
    const nearbyResources = this.getNearbyResources(zoneState, 2);
    const hpPercent = creature.currentHp / creature.stats.hp;

    return {
      agent: this.agent,
      creature,
      nearbyEnemies,
      nearbyResources,
      hpPercent,
      isInDanger: hpPercent < 0.25,
      hasTarget: this.agent.target !== null,
    };
  }
}

// Layer 1: Reflexes — instant reactions
class AgentReflex {
  constructor(private agent: Agent) {}

  check(obs: Observation): AgentAction | null {
    // Flee if critically low HP and low risk tolerance
    if (obs.hpPercent < 0.15 && this.agent.personality.riskTolerance < 50) {
      return { type: "flee", targetZone: "forest_entrance" };
    }

    // Use heal skill if available and HP < 50%
    if (obs.hpPercent < 0.5 && obs.creature.skills.find(s => s.type === "heal" && s.cdRemaining === 0)) {
      return { type: "use_skill", skillId: "heal" };
    }

    // Auto-attack if enemy in range
    if (obs.nearbyEnemies.length > 0 && obs.agent.state === "attacking") {
      const target = this.selectTarget(obs.nearbyEnemies);
      return { type: "attack", targetId: target.id };
    }

    return null;
  }

  private selectTarget(enemies: Enemy[]): Enemy {
    // Sort by: weakest first (greed > safety)
    return enemies.sort((a, b) => a.currentHp - b.currentHp)[0];
  }
}

// Layer 2: Strategy — goal-based decisions
class AgentStrategyLayer {
  constructor(private agent: Agent) {}

  decide(obs: Observation): AgentAction {
    switch (this.agent.strategy) {
      case "farming":   return this.farmingStrategy(obs);
      case "hunting":   return this.huntingStrategy(obs);
      case "exploring": return this.exploringStrategy(obs);
      case "trading":   return this.tradingStrategy(obs);
      default:          return { type: "idle" };
    }
  }

  private farmingStrategy(obs: Observation): AgentAction {
    if (obs.nearbyResources.length > 0) {
      return { type: "gather", resourceId: obs.nearbyResources[0].id };
    }
    if (obs.nearbyEnemies.length > 0 && obs.hpPercent > 0.5) {
      return { type: "move_to_attack", targetId: obs.nearbyEnemies[0].id };
    }
    // Move to farming hotspot
    return { type: "move", destination: this.getBestFarmSpot(obs) };
  }

  private huntingStrategy(obs: Observation): AgentAction {
    if (obs.nearbyEnemies.length > 0) {
      const strongest = obs.nearbyEnemies.sort((a, b) =>
        b.rewardValue - a.rewardValue
      )[0];
      return { type: "move_to_attack", targetId: strongest.id };
    }
    return { type: "move", destination: this.getHuntingGrounds(obs) };
  }

  private getBestFarmSpot(obs: Observation): Position {
    // Use memory to navigate to historically profitable zones
    const bestZone = obs.agent.memory.bestLootZone;
    return bestZone ? ZONE_SPAWN_POINTS[bestZone] : ZONE_SPAWN_POINTS["forest_center"];
  }
}

// Layer 3: Memory — learning from outcomes
class AgentMemoryLayer {
  constructor(private agent: Agent) {}

  update(obs: Observation, action: AgentAction): void {
    // Track profit
    if (action.type === "loot" && action.tokensGained) {
      this.agent.memory.profitHistory.push(action.tokensGained);
      if (this.agent.memory.profitHistory.length > 10) {
        this.agent.memory.profitHistory.shift();
      }
    }

    // Track danger
    if (obs.isInDanger && obs.nearbyEnemies[0]) {
      const enemyType = obs.nearbyEnemies[0].type;
      if (!this.agent.memory.dangerousEnemies.includes(enemyType)) {
        this.agent.memory.dangerousEnemies.push(enemyType);
      }
    }

    // Update best loot zone
    const avgProfit = this.agent.memory.profitHistory.reduce((a, b) => a + b, 0)
      / Math.max(this.agent.memory.profitHistory.length, 1);
    if (avgProfit > 100) {
      this.agent.memory.bestLootZone = this.agent.currentZone;
    }
  }
}
```

### 4.3 Tick Loop (Server-Side)

```typescript
// packages/backend/src/tick/tick-loop.ts

import { AgentManager } from "../agents/agent-manager";
import { ZoneManager } from "../world/zone-manager";
import { CombatEngine } from "../combat/combat-engine";
import { broadcastZoneState } from "../network/ws-server";

const TICK_RATE_MS = 200; // 5 ticks/second

export class TickLoop {
  private isRunning = false;
  private lastTick = Date.now();

  constructor(
    private agentManager: AgentManager,
    private zoneManager: ZoneManager,
    private combatEngine: CombatEngine,
  ) {}

  start() {
    this.isRunning = true;
    this.loop();
  }

  stop() {
    this.isRunning = false;
  }

  private loop() {
    if (!this.isRunning) return;

    const now = Date.now();
    const delta = now - this.lastTick;
    this.lastTick = now;

    this.tick(delta);

    setTimeout(() => this.loop(), TICK_RATE_MS);
  }

  private tick(delta: number) {
    // 1. Update all zones
    const zones = this.zoneManager.getAllZones();

    for (const zone of zones) {
      const zoneState = this.zoneManager.getZoneState(zone.id);

      // 2. Tick all agents in zone
      const agentActions = this.agentManager.tickZone(zone.id, zoneState);

      // 3. Resolve combat from agent actions
      const combatResults = this.combatEngine.resolve(agentActions, zoneState);

      // 4. Apply results to zone state
      this.zoneManager.applyResults(zone.id, combatResults);

      // 5. Respawn enemies if needed
      this.zoneManager.respawnEnemies(zone.id, delta);

      // 6. Broadcast to connected clients
      broadcastZoneState(zone.id, this.zoneManager.getZoneState(zone.id));
    }
  }
}
```

---

## 5. Combat Engine

```typescript
// packages/backend/src/combat/combat-engine.ts

export interface CombatResult {
  attacker: string;
  target: string;
  damage: number;
  isCrit: boolean;
  skillUsed: string | null;
  targetDied: boolean;
  lootDropped: LootDrop[];
}

export class CombatEngine {
  resolve(actions: AgentAction[], zoneState: ZoneState): CombatResult[] {
    const results: CombatResult[] = [];

    for (const action of actions) {
      if (action.type !== "attack" && action.type !== "use_skill") continue;

      const attacker = zoneState.creatures[action.agentId];
      const target = zoneState.enemies[action.targetId];
      if (!attacker || !target) continue;

      const result = this.calculateHit(attacker, target, action.skillId);
      target.currentHp -= result.damage;
      result.targetDied = target.currentHp <= 0;

      if (result.targetDied) {
        result.lootDropped = this.rollLoot(target);
        zoneState.enemies[action.targetId].isDead = true;
      }

      results.push(result);
    }

    return results;
  }

  private calculateHit(
    attacker: CreatureState,
    target: EnemyState,
    skillId: string | null
  ): CombatResult {
    const baseAttack = attacker.stats.attack;
    const defense = target.stats.defense;
    const skillMultiplier = skillId ? SKILL_MULTIPLIERS[skillId] ?? 1 : 1;

    // Damage formula: (ATK * multiplier) - (DEF * 0.5) + random variance
    const baseDamage = Math.max(1,
      (baseAttack * skillMultiplier) - (defense * 0.5)
    );
    const variance = 0.8 + Math.random() * 0.4; // ±20%
    const damage = Math.round(baseDamage * variance);

    // Crit: based on speed stat
    const critChance = attacker.stats.speed / 1000;
    const isCrit = Math.random() < critChance;

    return {
      attacker: attacker.id,
      target: target.id,
      damage: isCrit ? damage * 2 : damage,
      isCrit,
      skillUsed: skillId,
      targetDied: false,
      lootDropped: [],
    };
  }

  private rollLoot(enemy: EnemyState): LootDrop[] {
    const drops: LootDrop[] = [];
    for (const entry of enemy.lootTable) {
      if (Math.random() < entry.dropChance) {
        drops.push({
          type: entry.type,
          amount: entry.minAmount + Math.floor(
            Math.random() * (entry.maxAmount - entry.minAmount)
          ),
        });
      }
    }
    return drops;
  }
}
```

---

## 6. WebSocket Server

```typescript
// packages/backend/src/network/ws-server.ts

import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";

export type WSMessage =
  | { type: "zone_state"; zoneId: string; data: ZoneState }
  | { type: "combat_event"; result: CombatResult }
  | { type: "agent_update"; agentId: string; state: AgentState }
  | { type: "loot_drop"; agentId: string; drops: LootDrop[] }
  | { type: "player_move"; position: { x: number; y: number } }
  | { type: "error"; message: string };

const clients = new Map<string, { ws: WebSocket; zone: string; playerId: string }>();
const zoneClients = new Map<string, Set<string>>();

export function createWSServer(port: number) {
  const wss = new WebSocketServer({ port });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const playerId = extractPlayerId(req);
    const zoneId = "forest_1"; // default zone

    clients.set(playerId, { ws, zone: zoneId, playerId });

    if (!zoneClients.has(zoneId)) zoneClients.set(zoneId, new Set());
    zoneClients.get(zoneId)!.add(playerId);

    ws.on("message", (data) => handlePlayerMessage(playerId, JSON.parse(data.toString())));
    ws.on("close", () => handleDisconnect(playerId));

    ws.send(JSON.stringify({ type: "connected", playerId }));
  });

  return wss;
}

export function broadcastZoneState(zoneId: string, state: ZoneState) {
  const clientIds = zoneClients.get(zoneId);
  if (!clientIds) return;

  const message = JSON.stringify({ type: "zone_state", zoneId, data: state });

  for (const clientId of clientIds) {
    const client = clients.get(clientId);
    if (client?.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}
```

---

## 7. NFT Metadata Schema (IPFS)

```json
{
  "$schema": "https://json-schema.org/draft/07/schema",
  "title": "CreatureQuest NFT Metadata",
  "type": "object",
  "properties": {
    "name": { "type": "string", "example": "Thornbark #4291" },
    "description": { "type": "string" },
    "image": { "type": "string", "format": "uri", "description": "IPFS URI to creature image" },
    "animation_url": { "type": "string", "description": "IPFS URI to sprite sheet" },
    "external_url": { "type": "string", "description": "https://creaturequest.xyz/creature/4291" },
    "attributes": {
      "type": "array",
      "items": [
        { "trait_type": "Class",      "value": "Plant" },
        { "trait_type": "Rarity",     "value": "Epic" },
        { "trait_type": "Level",      "value": 1, "display_type": "number" },
        { "trait_type": "HP",         "value": 1000, "max_value": 2000 },
        { "trait_type": "Attack",     "value": 60, "max_value": 200 },
        { "trait_type": "Speed",      "value": 50, "max_value": 200 },
        { "trait_type": "Defense",    "value": 90, "max_value": 200 },
        { "trait_type": "Body Part",  "value": "Mossy Bark" },
        { "trait_type": "Head Part",  "value": "Leaf Crown" },
        { "trait_type": "Tail Part",  "value": "Vine Whip" },
        { "trait_type": "Breed Count","value": 0, "max_value": 7 },
        { "trait_type": "Generation", "value": 1 }
      ]
    },
    "properties": {
      "type": "object",
      "properties": {
        "genes": {
          "dominant": "0x3a4f...",
          "recessive": "0x9b2c..."
        },
        "skills": ["leaf_blade", "vine_wrap", "photosynthesis"],
        "evolved": false
      }
    }
  }
}
```

---

## 8. Tokenomics Model

### Supply

| Parameter         | Value               |
|-------------------|---------------------|
| Token name        | QuestToken (QUEST)  |
| Max supply        | 1,000,000,000       |
| Initial supply    | 0 (fully emitted)   |
| Daily cap         | 10,000 QUEST        |

### Sources (Inflows)

| Activity           | Reward         | Notes                        |
|--------------------|----------------|------------------------------|
| Kill enemy         | 1-50 QUEST     | Scales with enemy difficulty |
| Resource gathering | 0.5-5 QUEST    | Per resource node            |
| Arena win (PvP)    | 10-100 QUEST   | Wager-based                  |
| Daily quests       | 25 QUEST       | Per account, once/day        |
| Dungeon clear      | 100-500 QUEST  | One-time per dungeon tier    |

### Sinks (Outflows — Anti-Inflation)

| Activity           | Cost             | Mechanism        |
|--------------------|------------------|------------------|
| Breeding           | 1,000 QUEST      | Token burn       |
| Creature evolution | 500 QUEST        | Token burn       |
| Item crafting      | 10-200 QUEST     | Partial burn     |
| Marketplace fee    | 4% of sale       | Partial burn     |
| Equipment repair   | 5-50 QUEST       | Burn             |
| Agent activation   | 100 QUEST/month  | Protocol revenue |

### Anti-Inflation Controls

1. **Hard cap**: 1B max supply, never mintable above
2. **Daily emission cap**: Only 10k QUEST/day can be minted game-wide
3. **Dynamic rewards**: As more players join, per-kill rewards decrease
4. **Breeding limit**: Max 7 breeds per creature, exponential cost increase
5. **Breed cooldown**: 5-day cooldown per parent creature
6. **Resource scarcity**: Nodes respawn on 30-min timer, limited nodes per zone

---

## 9. REST API

```
Base URL: https://api.creaturequest.xyz/v1

AUTH:
POST   /auth/wallet          Sign-in with wallet (SIWE)
GET    /auth/me              Current user info

CREATURES:
GET    /creatures            List all creatures (paginated)
GET    /creatures/:id        Single creature details
POST   /creatures/mint       Request creature mint (requires auth)
GET    /creatures/owner/:address  Creatures owned by address

AGENTS:
GET    /agents               List all active agents
GET    /agents/:id           Single agent details
POST   /agents               Create/assign agent to creature
PUT    /agents/:id/config    Update agent strategy/personality
DELETE /agents/:id           Deactivate agent
GET    /agents/:id/history   Agent battle/farm history

COMBAT:
GET    /combat/log           Recent combat events
GET    /combat/log/:zoneId   Zone-specific combat log

ECONOMY:
GET    /economy/stats        Token supply, circulation, burn rate
GET    /marketplace          Active listings
POST   /marketplace/list     Create listing
DELETE /marketplace/:id      Cancel listing
POST   /marketplace/:id/buy  Purchase item

LEADERBOARD:
GET    /leaderboard/earnings  Top earners
GET    /leaderboard/agents    Top agents by performance
GET    /leaderboard/creatures Top creatures by level/wins

ZONES:
GET    /zones                All zone definitions
GET    /zones/:id/state      Current zone live state
```

---

## 10. Database Schema (PostgreSQL)

```sql
-- Players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  farcaster_fid BIGINT,
  username VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creatures (mirrors on-chain state)
CREATE TABLE creatures (
  id BIGINT PRIMARY KEY,  -- NFT token ID
  owner_address VARCHAR(42) NOT NULL,
  class VARCHAR(20) NOT NULL,
  rarity VARCHAR(20) NOT NULL,
  level SMALLINT DEFAULT 1,
  exp BIGINT DEFAULT 0,
  hp SMALLINT NOT NULL,
  attack SMALLINT NOT NULL,
  speed SMALLINT NOT NULL,
  defense SMALLINT NOT NULL,
  breed_count SMALLINT DEFAULT 0,
  last_breed_time TIMESTAMPTZ,
  is_evolved BOOLEAN DEFAULT FALSE,
  metadata_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_address VARCHAR(42) NOT NULL,
  creature_id BIGINT REFERENCES creatures(id),
  strategy VARCHAR(20) NOT NULL DEFAULT 'farming',
  aggression SMALLINT DEFAULT 50,
  greed SMALLINT DEFAULT 50,
  risk_tolerance SMALLINT DEFAULT 50,
  behavior_hash TEXT,
  total_tokens_earned NUMERIC(20,8) DEFAULT 0,
  battles_won INT DEFAULT 0,
  battles_lost INT DEFAULT 0,
  current_zone VARCHAR(50) DEFAULT 'forest_1',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Combat Log
CREATE TABLE combat_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id TEXT NOT NULL,  -- agent ID or player ID
  target_id TEXT NOT NULL,    -- enemy ID or player ID
  zone_id VARCHAR(50) NOT NULL,
  damage INT NOT NULL,
  is_crit BOOLEAN DEFAULT FALSE,
  skill_used VARCHAR(50),
  target_died BOOLEAN DEFAULT FALSE,
  tokens_earned NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_address VARCHAR(42) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace listings
CREATE TABLE marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_address VARCHAR(42) NOT NULL,
  item_type VARCHAR(20) NOT NULL,  -- 'creature' | 'item' | 'resource'
  item_id TEXT NOT NULL,
  price_quest NUMERIC(20,8) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sold_at TIMESTAMPTZ
);
```

---

## 11. Scaling Plan (10,000+ Agents)

### Architecture

```
                    ┌──────────────────┐
                    │   Load Balancer   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───┐ ┌────────▼───┐ ┌───────▼────┐
     │ Zone Srv 1 │ │ Zone Srv 2 │ │ Zone Srv N │
     │ (Forest)   │ │ (Cave)     │ │ (Dungeon)  │
     └────────────┘ └────────────┘ └────────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼─────────┐
                    │   Redis Cluster  │
                    │ (Shared State)   │
                    └──────────────────┘
                             │
                    ┌────────▼─────────┐
                    │  PostgreSQL DB   │
                    │  (Read Replicas) │
                    └──────────────────┘
```

### Key Techniques

1. **Zone sharding**: Each game zone runs on its own server process
2. **Agent batching**: Process 100 agents/tick in parallel worker threads
3. **Redis pub/sub**: Zone state broadcast without DB round-trips
4. **Tick skipping**: Idle agents skip ticks to save CPU
5. **Spatial partitioning**: Only process agents within proximity
6. **Lazy DB writes**: Buffer combat results, write to DB every 10 ticks
7. **Kubernetes HPA**: Auto-scale zone servers based on agent count

### Target Metrics

| Metric              | Target    |
|---------------------|-----------|
| Agents per zone     | 1,000     |
| Total agents        | 10,000+   |
| Tick rate           | 5/sec     |
| WS latency          | <100ms    |
| DB write latency    | <50ms     |
| API response time   | <200ms    |

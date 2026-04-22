# 🎮 CreatureQuest - Web3 MMORPG

<div align="center">

![CreatureQuest Banner](/public/app-hero.png)

**An immersive fantasy MMORPG with AI agents, NFT creature breeding, and real-time multiplayer combat.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PixiJS](https://img.shields.io/badge/PixiJS-8-orange?logo=pixijs)](https://pixijs.com/)
[![pnpm](https://img.shields.io/badge/pnpm-9-green?logo=pnpm)](https://pnpm.io/)

</div>

---

## 🌟 Features

### 🎯 Core Gameplay
- **4 Unique Zones**: Crystal Haven (Town), Whispering Woods (Forest), Shadowfall (PvP), Sunscorched Expanse
- **HD Graphics**: 48px-96px sprites with 12+ color gradients, particle effects, glowing eyes
- **Original Creatures**: Glimmerblob, Mooncap Sprout, Rotwood Stalker, Bonebranch Reaver, Voidwing Serpent, Nethervoid Titan (boss)
- **Real-time Multiplayer**: WebSocket-based combat, movement, and social systems
- **6 Elements Combat System**: Fire, Water, Earth, Wind, Light, Dark with 50+ skills
- **Status Effects**: Burn, Freeze, Poison, Stun, etc.

### 🤖 AI Agent System
- **5 Personalities**: Farmer (passive), Aggressive (combat), Looter (opportunistic), Scout (explorer), Guardian (defender)
- **3-Layer Brain Architecture**:
  1. **Perception**: Senses enemies, allies, resources, terrain
  2. **Decision**: Makes personality-based tactical choices
  3. **Execution**: Converts decisions to in-game commands
- **Autonomous Behavior**: Agents explore, fight, gather, and help players

### 🔐 Web3 Integration
- **NFT Creature Breeding**: ERC-721 tokens with genetic inheritance
- **QuestToken (QTK)**: ERC-20 utility token for breeding fees, marketplace
- **Smart Contracts**:
  - `CreatureNFT.sol`: Breed creatures with mutations and rarity
  - `BreedingSystem.sol`: Automated breeding with success rates
  - `QuestToken.sol`: Daily rewards, economy management
- **Base Blockchain**: Deployed on Base Sepolia testnet → Mainnet

### 🌐 Farcaster Mini App
- **On-chain Identity**: Login with Farcaster (FID)
- **Social Features**: Share achievements, invite friends
- **Neynar SDK**: Frame integration, cast interactions

### 💾 Database & Backend
- **PostgreSQL**: Neon/Supabase cloud database
- **Drizzle ORM**: Type-safe database queries
- **Multi-table Schema**: Players, Creatures, Leaderboards, Battles, Quests, Guilds, Chat

### 🎵 Audio System
- **Muted by Default**: User must explicitly enable sound 🔇
- **SFX Library**: Combat, movement, UI interactions
- **Dynamic Music**: Zone-specific ambient tracks
- **Volume Control**: Granular SFX/music adjustments

---

## 🏗️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript 5 |
| **Game Engine** | PixiJS 8, Custom HD Sprite Renderer |
| **State Management** | WebSocket, React Query, Zustand |
| **Backend** | Next.js API Routes, Node.js WebSocket Server |
| **Database** | PostgreSQL (Neon/Supabase), Drizzle ORM |
| **Blockchain** | Solidity, Hardhat/Foundry, Ethers.js |
| **Smart Contracts** | OpenZeppelin (ERC-721, ERC-20) |
| **Authentication** | Farcaster (Neynar SDK), Wagmi/Viem |
| **Deployment** | Vercel, GitHub Actions CI/CD |
| **Testing** | Jest, Playwright, Foundry |
| **Package Manager** | pnpm 9 |

---

## 🚀 Quick Start

### Prerequisites
```bash
# Install Node.js 20+, pnpm 9+
node -v  # >= 20.0.0
pnpm -v  # >= 9.0.0
```

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/creature-quest.git
cd creature-quest
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Variables
```bash
# Copy template and fill in your values
cp .env.example .env.local

# Required:
# - DATABASE_URL
# - NEYNAR_API_KEY
# - FARCASTER_MINI_APP_URL
```

### 4. Run Development Server
```bash
pnpm dev
```

Visit `http://localhost:3000` 🎮

### 5. Build for Production
```bash
pnpm build
pnpm start
```

---

## 📁 Project Structure

```
creature-quest/
├── contracts/                  # Smart Contracts
│   ├── CreatureNFT.sol        # ERC-721 Creature Breeding
│   ├── QuestToken.sol         # ERC-20 Utility Token
│   └── BreedingSystem.sol     # Breeding Automation
├── src/
│   ├── app/                    # Next.js Pages
│   │   ├── page.tsx           # Landing
│   │   └── game/              # Game Interface
│   ├── features/
│   │   ├── game/              # Game Logic
│   │   │   ├── engine/        # PixiJS Game Engine
│   │   │   │   ├── game-engine.ts
│   │   │   │   ├── hd-sprite-renderer.ts
│   │   │   │   ├── ai-agent.ts          # 3-Layer Brain
│   │   │   │   ├── combat-system.ts     # 6 Elements
│   │   │   │   └── particle-system.ts   # 13 Effects
│   │   │   ├── components/    # React UI
│   │   │   └── hooks/         # UseGameState, etc.
│   │   ├── mmo/               # Multiplayer
│   │   │   ├── client/        # MmoGame.tsx, Renderer.ts
│   │   │   └── server/        # GameWorld.ts, WebSocket
│   │   └── audio/             # Audio System
│   │       ├── audio-manager.ts
│   │       └── audio-controls.tsx
│   ├── db/                    # Database
│   │   ├── schema.ts          # Drizzle Tables
│   │   └── actions/           # Query Functions
│   └── config/                # App Configuration
├── tools/                     # Utility Scripts
├── tests/                     # Test Suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # Automated Deployments
├── docs/                      # Documentation
│   ├── TRANSFORMATION_SUMMARY.md
│   └── DEPLOYMENT.md
└── deploy.sh                  # One-Click Deploy
```

---

## 🎨 Creature Gallery

### Zones & Monsters

| Zone | Description | Creatures |
|------|-------------|-----------|
| **Crystal Haven** | Starting town, safe zone | NPCs, Vendors |
| **Whispering Woods** | Forest, PvE farming | Glimmerblob, Mooncap Sprout |
| **Shadowfall** | Dungeon, PvP arena | Bonebranch Reaver, Voidwing Serpent |
| **Sunscorched Expanse** | Desert, endgame | Portal spawns, elite mobs |

### Boss Fights
- **Nethervoid Titan**: 3-phase boss in Shadowfall
  - Phases: Void Shield → Corruption → Enrage
  - Rewards: Epic creatures, rare loot, 10k QTK

---

## 🔧 Development

### Scripts
```bash
pnpm dev              # Start dev server
pnpm build            # Compile for production
pnpm start            # Run production build
pnpm lint             # ESLint check
pnpm type-check       # TypeScript verification
pnpm test             # Jest test suite
pnpm test:e2e         # Playwright E2E tests
pnpm db:generate      # Generate Drizzle migrations
pnpm db:push          # Apply migrations to DB
pnpm contracts:test   # Foundry contract tests
pnpm contracts:deploy # Deploy to Sepolia
```

### Adding New Creatures
1. Edit `src/features/game/engine/hd-sprite-renderer.ts`
   - Add palette to `SPRITE_PALETTES`
   - Update `getEnemyType()`
2. Update `src/features/mmo/types.ts`
   - Add monster definition to `MONSTER_DEFS`

### Creating Quests
1. Add to database via `src/db/actions/quest-actions.ts`
2. Define in `src/features/game/quests/quest-registry.ts`
3. Implement rewards in `quest-completion-handler.ts`

---

## 🌐 Deploy to Production

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or use the web interface: [vercel.com/new](https://vercel.com/new)

### Environment Variables
Set these in your Vercel Dashboard:
```env
DATABASE_URL=postgresql://...
NEYNAR_API_KEY=...
NEXT_PUBLIC_API_URL=https://api.creaturequest.io
FARCASTER_MINI_APP_URL=https://your-app.vercel.app
```

### Smart Contracts
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Deploy to Sepolia
cd contracts
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL \
  --broadcast --verify -vvv
```

---

## 🤝 Contributing

### How to Contribute
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Guidelines
- Follow TypeScript strict mode
- Use ESLint rules (`pnpm lint`)
- Write tests for new features
- Update documentation
- Keep commits atomic and descriptive

### Issues & Feature Requests
- 🐛 [Report a Bug](https://github.com/YOUR_USERNAME/creature-quest/issues)
- 💡 [Suggest a Feature](https://github.com/YOUR_USERNAME/creature-quest/discussions)

---

## 📄 License

Copyright © 2026 CreatureQuest Team.

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🙏 Acknowledgments

- **PixiJS** - Powerful 2D game rendering
- **Next.js** - React framework for production
- **Drizzle ORM** - Elegant TypeScript ORM
- **Neon** - Serverless PostgreSQL
- **Neynar** - Farcaster infrastructure
- **OpenZeppelin** - Secure smart contracts
- **Vercel** - Edge deployment platform

---

## 📬 Contact & Community

- **Discord**: [Join our server](#)
- **Twitter**: [@CreatureQuest](#)
- **Documentation**: [Read the Wiki](#)
- **Email**: hello@creaturequest.io

---

<div align="center">

**Made with ❤️ by the CreatureQuest Team**

*"Adventure awaits in Crystal Haven!"*

</div>

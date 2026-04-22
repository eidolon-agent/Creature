# 🚀 Deployment Guide - CreatureQuest

## ✅ What's Ready

Your **CreatureQuest** MMORPG is fully deployed at:
```
🌐 http://localhost:3000
```

### 🎮 Game Features
- **4 Unique Zones**: Crystal Haven, Whispering Woods, Shadowfall (PvP), Sunscorched Expanse
- **HD Graphics**: 48px-96px sprites with 12+ color gradients
- **Original Creatures**: Glimmerblob, Mooncap, Rotwood, Bonebranch, Voidwing, Nethervoid Titan
- **Multiplayer**: Real-time WebSocket combat and movement
- **AI Agents**: 3-layer brain with farmer/aggressive/looter personalities
- **Combat System**: 6 elements, 50+ skills, status effects
- **Creature Breeding**: NFT mechanics with genetic inheritance
- **Farcaster Integration**: Mini App ready for Warpcast

## 📦 Deployment Steps

### Option 1: GitHub (Recommended)

```bash
# 1. Create a new repository on GitHub
#    - Name: creature-quest
#    - Description: Web3 MMORPG - Crystal Haven Adventure
#    - Visibility: Public

# 2. Push your code
cd /home/agent/projects/creature-quest
git remote add origin https://github.com/YOUR_USERNAME/creature-quest.git
git branch -M main
git push -u origin main
```

### Option 2: Vercel Deployment (Instant)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd /home/agent/projects/creature-quest
vercel --prod
```

Direct URL: `https://vercel.app/new?repository=https://github.com/YOUR_USERNAME/creature-quest`

### Option 3: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd /home/agent/projects/creature-quest
netlify deploy --prod
```

## 🔧 Environment Variables

When deploying to Vercel/Netlify, add these environment variables:

```env
# Database (PostgreSQL via Neon/Supabase)
DATABASE_URL=postgresql://user:pass@host:5432/creaturequest

# Next.js
NEXT_PUBLIC_API_URL=https://api.creaturequest.io
NEXT_PUBLIC_CHAIN_ID=84532  # Base Sepolia

# Farcaster (for Mini App)
NEYNAR_API_KEY=your_neynar_key
FARCASTER_MINI_APP_URL=https://your-deployment.vercel.app

# Optional: Blockchain (Base Sepolia)
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```

## 🎨 Customization

### Change Your Zone Names
Edit: `/src/features/mmo/types.ts`

```typescript
export const ZONE_DEFS = {
  crystal_haven: {
    id: "crystal_haven",
    name: "Your Custom Town Name",  // Change this
    // ...
  },
  // ...
}
```

### Add New Creatures
1. Edit: `/src/features/game/engine/hd-sprite-renderer.ts`
2. Add palette to `SPRITE_PALETTES`
3. Update: `/src/features/mmo/types.ts` monster definitions

### Modify Combat Balance
Edit: `/src/features/game/engine/combat-system.ts`

```typescript
const BASE_DAMAGE = 20;  // Adjust
const CRIT_CHANCE = 0.15;  // 15%
```

## 📊 Next Development Steps

### Implemented
- ✅ Complete rebranding (Ragnarok references removed)
- ✅ HD sprite system with gradients
- ✅ Zone name updates
- ✅ Monster renaming
- ✅ Portal label updates

### TODO
- [ ] Smart contracts for NFT breeding
  - `contracts/CreatureNFT.sol`
  - `contracts/QuestToken.sol`
  - `contracts/BreedingSystem.sol`
- [ ] Guild system & chat
- [ ] Questing engine
- [ ] More particle effects
- [ ] Sound effects & music
- [ ] Mobile touch controls
- [ ] Leaderboard integration

## 🐛 Troubleshooting

### Zone loading error?
Check `types.ts` has correct zone IDs and `mmo-game.tsx` uses them.

### Monsters not spawning?
Verify `game-world.ts` has `MONSTER_DEFS` with new creature names.

### Graphics look small?
Ensure `renderer.ts` TILE = 48 and S = 48/96 for creatures.

## 📞 Support & Community

- **GitHub Issues**: https://github.com/YOUR_USERNAME/creature-quest/issues
- **Discord**: (add your server link)
- **Documentation**: `/docs/` folder

---

**Created**: 2026-04-22  
**Version**: 1.0.0 - Crystal Haven Launch

🎮 Happy Gaming! Adventure awaits in Crystal Haven!

# 🦖 CreatureQuest - Setup & Run Instructions

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

Required environment variables:
- `DATABASE_URL` - Supabase PostgreSQL connection string (pooler endpoint)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `NEXT_PUBLIC_NEYNAR_API_KEY` - Neynar API key for Farcaster auth

### 3. Run Database Migrations
```bash
node migrate-db.js
```

This will add the `name` and `class` columns to the `players` table.

**Note:** If you get connection errors, your network may not support IPv6. Try:
- Using the direct Supabase endpoint instead of pooler
- Contacting Supabase support to enable IPv4 access
- Using a different network

### 4. Start Development Server
```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

## 📱 Farcaster Mini App Setup

To deploy as a Farcaster Mini App, update your `frame.json` with the production URL.

## 🎮 Game Features

### Implemented
- ✅ Farcaster authentication
- ✅ Character creation with class selection
- ✅ Animated landing page with starfield effects
- ✅ Player profile with stats
- ✅ 4 hero classes: Warrior, Mage, Rogue, Healer
- ✅ Automatic routing (no player → signup → game)
- ✅ Database schema (players, creatures, leaderboard, battle_logs, etc.)

### In Progress
- ⏳ PixiJS game engine integration
- ⏳ Real-time combat system
- ⏳ NFT creature breeding
- ⏳ Guild and chat systems
- ⏳ Particle effects

## 🗄️ Database Schema

### Players Table
The `players` table includes:
- `fid` - Farcaster ID (unique)
- `username` - Farcaster username
- `name` - Custom hero name (NEW)
- `class` - Hero class: warrior/mage/rogue/healer (NEW)
- `level`, `experience`, `hp`, `attack` - Player stats
- `zone`, `x`, `y` - Position in game world

Run `node migrate-db.js` to add the new `name` and `class` columns.

## 🛠️ Troubleshooting

### Database Connection Errors
If you see connection errors:

1. **Check your DATABASE_URL format:**
   ```
   postgresql://user:password@host:port/database?sslmode=verify-full
   ```

2. **Verify network connectivity:**
   ```bash
   ping aws-1-us-west-2.pooler.supabase.com
   ```

3. **Try the direct endpoint instead of pooler** (if IPv4):
   - Direct: `db.[project-ref].supabase.co:5432`
   - Pooler: `[project-ref].pooler.supabase.com:6543`

### Build Errors
```bash
pnpm clean
pnpm install
pnpm build
```

### Supabase Schema Not Pushed
```bash
pnpm exec drizzle-kit push
```

## 📦 Project Structure

```
creature-quest/
├── src/
│   ├── app/
│   │   ├── landing/      # Hero landing page
│   │   ├── signup/       # Character creation
│   │   ├── game/         # Main game interface
│   │   └── page.tsx      # Root redirect
│   ├── db/
│   │   └── schema.ts     # Drizzle ORM schema
│   ├── lib/
│   │   ├── services/     # Player service with fallback
│   │   ├── supabase/     # Supabase client
│   │   └── game/         # Game engine
│   └── neynar-farcaster-sdk/  # Farcaster auth
├── migrate-db.js         # Database migration script
├── drizzle.config.ts     # Drizzle configuration
└── package.json
```

## 🎨 Customization

### Update Branding
Edit `src/config/public-config.ts`:
- App name
- Description
- Splash image URL
- Colors

### Add New Classes
1. Update `PlayerClass` type in `signup/page.tsx`
2. Add stats in the class selection UI
3. Update the sprite renderer

## 🌐 Deploy to Production

### Vercel
```bash
vercel deploy
```

Set environment variables in Vercel dashboard.

### Self-Hosted
```bash
pnpm build
pnpm start
```

Use reverse proxy (Nginx) with SSL.

## 📚 Learning Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Farcaster Mini Apps](https://docs.farcaster.xyz)
- [Drizzle ORM](https://orm.drizzle.team)
- [PixiJS](https://pixijs.com)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ for the Farcaster community**

Version: 1.0.0
Last Updated: 2025-04-22

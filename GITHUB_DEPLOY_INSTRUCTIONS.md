# 🚀 GitHub Deployment Instructions

Since GitHub CLI is not authenticated, follow these manual steps to deploy your CreatureQuest!

## Option 1: Quick Deploy via GitHub Web Interface

1. **Create a New Repository on GitHub**
   - Go to https://github.com/new
   - Repository name: `creature-quest`
   - Description: "Web3 MMORPG - Adventure in Crystal Haven 🎮✨"
   - Visibility: ☑️ Public
   - ☐ Don't add README (we'll push existing code)
   - Click **Create repository**

2. **Add Remote and Push (In Terminal)**
   ```bash
   cd /home/agent/projects/creature-quest
   
   # Replace YOUR_USERNAME with your actual GitHub username
   git remote add origin https://github.com/YOUR_USERNAME/creature-quest.git
   
   # Push to main branch
   git push -u origin main
   ```

3. **Your game is now on GitHub!**
   - URL: `https://github.com/YOUR_USERNAME/creature-quest`
   - Share with the world! 🌍

## Option 2: Deploy Directly to Vercel (Live in 2 minutes!)

### A. Using Vercel CLI (requires login)
```bash
npm install -g vercel
vercel login  # Follow prompts
vercel --prod  # From your project directory
```

### B. Using GitHub (Recommended)
1. First, push to GitHub using **Option 1** above
2. Go to https://vercel.com/new
3. Import your `creature-quest` repository
4. Click **Deploy**
5. Get your live URL: `https://creature-quest.vercel.app`

### C. Environment Variables (Add in Vercel Dashboard)
```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_API_URL=https://your-deployment.vercel.app
NEYNAR_API_KEY=your_key_here
```

## Option 3: Deploy to Netlify

1. Push to GitHub (Option 1)
2. Go to https://app.netlify.com/new
3. Import your repository
4. Build settings:
   - Build command: `pnpm build`
   - Publish directory: `.next`
5. Click **Deploy**

## 🔍 Verify Your Deployment

After deploying, test these URLs:
- ✅ Main page: `https://your-deployment.vercel.app`
- ✅ Game API: `https://your-deployment.vercel.app/api/mmo/state`
- ✅ Leaderboard: `https://your-deployment.vercel.app/api/leaderboard`

## 📱 Share Your Game!

Once deployed, you can:
1. Share the URL with friends
2. Post on social media with `#CreatureQuest #Web3Gaming`
3. Add to Farcaster frames (mini-app integration ready!)

## 🐛 Troubleshooting

**Error: "remote already exists"**
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/creature-quest.git
```

**Error: "push rejected"**
```bash
git push -u origin main --force
# Careful: this overwrites remote history
```

**Need to add a .gitignore?**
Already included! The repository has proper ignores for `node_modules`, `.env`, etc.

---

## 🎮 What's Next After Deployment?

1. **Enable Auto-Deploy**: Every `git push` updates your live site
2. **Add Custom Domain**: In Vercel/Netlify settings
3. **Monitor Analytics**: Track player activity
4. **GitHub Actions**: Set up CI/CD pipelines
5. **Database**: Provision a free Neon/Supabase PostgreSQL instance

---

**Congratulations on your fully upgraded CreatureQuest!** 🎉

Your game now features:
- ✨ HD crystal sprites (48-96px)
- 🌍 4 unique zones with new names
- 🐉 Original monster identities
- 🎯 Real-time multiplayer combat
- 🤖 AI agent system with personalities
- 🏆 Leaderboard & breeding mechanics

Share your adventure with the world!

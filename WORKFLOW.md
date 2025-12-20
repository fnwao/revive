# 🚀 Development & Deployment Workflow

## Current Setup

Right now, you're deploying manually via Vercel CLI. Here's how to set up automatic deployments.

## Option 1: Automatic Deployments (Recommended) ⭐

### Setup (One Time)

1. **Push your code to GitHub** (if not already done):
   ```bash
   cd "/Users/feminwaojigba/untitled folder/revive-ai"
   git push --set-upstream origin main
   ```

2. **Connect GitHub to Vercel**:
   - Go to: https://vercel.com/dashboard
   - Click your project: `revive-silk`
   - Go to **Settings** → **Git**
   - Click **Connect Git Repository**
   - Select your repository: `fnwao/revive`
   - Vercel will automatically detect the `nextjs-frontend` directory

3. **Configure Auto-Deploy**:
   - **Production Branch**: `main` (or `master`)
   - **Root Directory**: `nextjs-frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

### Daily Workflow (After Setup)

1. **Make changes locally**:
   ```bash
   # Edit files in your code editor
   # Test locally: npm run dev
   ```

2. **Commit changes**:
   ```bash
   cd "/Users/feminwaojigba/untitled folder/revive-ai"
   git add .
   git commit -m "Your change description"
   ```

3. **Push to GitHub**:
   ```bash
   git push
   ```

4. **Vercel automatically deploys**:
   - Creates a preview deployment for every push
   - Deploys to production when you push to `main` branch
   - You'll get a notification when deployment completes

### That's It! 🎉

Every time you push to GitHub, Vercel automatically:
- ✅ Builds your app
- ✅ Creates a preview deployment
- ✅ Deploys to production (if on main branch)

## Option 2: Manual Deployment (Current)

If you prefer manual control:

1. **Make changes locally**
2. **Test locally**: `npm run dev`
3. **Deploy manually**:
   ```bash
   cd "/Users/feminwaojigba/untitled folder/revive-ai/nextjs-frontend"
   npx vercel --prod
   ```

## Option 3: Deploy from Vercel Dashboard

1. **Make changes and push to GitHub**
2. **Go to Vercel Dashboard**
3. **Click "Redeploy"** on any deployment
4. **Select the commit/branch** you want to deploy

## Best Practice Workflow

### For Small Changes:
```bash
# 1. Edit files
# 2. Test locally
npm run dev

# 3. Commit and push
git add .
git commit -m "Fix: description"
git push

# 4. Vercel auto-deploys (if GitHub connected)
```

### For Big Features:
```bash
# 1. Create a feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "Add: new feature"

# 3. Push feature branch
git push -u origin feature/new-feature

# 4. Vercel creates preview deployment automatically
# 5. Test preview URL
# 6. Merge to main when ready
git checkout main
git merge feature/new-feature
git push

# 7. Vercel auto-deploys to production
```

## Quick Reference

| Action | Command |
|--------|---------|
| Test locally | `npm run dev` |
| Build locally | `npm run build` |
| Deploy preview | `npx vercel` |
| Deploy production | `npx vercel --prod` |
| View deployments | https://vercel.com/dashboard |

## Tips

- ✅ **Always test locally first**: `npm run dev`
- ✅ **Use preview deployments** to test before production
- ✅ **Check Vercel dashboard** for deployment status
- ✅ **Set up GitHub integration** for automatic deployments
- ✅ **Use feature branches** for big changes

---

**Recommended**: Set up Option 1 (Automatic Deployments) for the smoothest workflow!


# ⚡ Quick Setup: Automatic Deployments

## Step 1: Push to GitHub (Run in Terminal)

```bash
cd "/Users/feminwaojigba/untitled folder/revive-ai"
git push --set-upstream origin main
```

**If you get authentication errors**, you'll need to:
- Enter your GitHub username
- Use a Personal Access Token (not password)
- Get token from: https://github.com/settings/tokens

## Step 2: Connect in Vercel Dashboard

1. **Go to**: https://vercel.com/dashboard
2. **Click**: `revive-silk` project
3. **Click**: **Settings** (top right)
4. **Click**: **Git** (left sidebar)
5. **Click**: **Connect Git Repository** (or "Disconnect" if already connected)
6. **Select**: `fnwao/revive`
7. **Configure**:
   - **Root Directory**: `nextjs-frontend` ⚠️ **CRITICAL!**
   - **Production Branch**: `main`
8. **Click**: **Save**

## Step 3: Test It!

```bash
# Make a small change to any file
# Then:
git add .
git commit -m "Test auto-deploy"
git push
```

Check Vercel dashboard - you should see a deployment start automatically! 🚀

---

**That's it!** Now every `git push` automatically deploys to production.


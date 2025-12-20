# 🚀 Setup Automatic Deployments - Step by Step

## Step 1: Push Code to GitHub

Run this in your terminal (you'll need to authenticate):

```bash
cd "/Users/feminwaojigba/untitled folder/revive-ai"
git add .
git commit -m "Setup for automatic deployments"
git push --set-upstream origin main
```

**Note**: If you get authentication errors, you may need to:
- Use a Personal Access Token instead of password
- Or set up SSH keys
- Or use GitHub CLI: `gh auth login`

## Step 2: Connect GitHub to Vercel

1. **Go to Vercel Dashboard**:
   - Visit: https://vercel.com/dashboard
   - Click on your project: **revive-silk**

2. **Navigate to Git Settings**:
   - Click **Settings** (top right)
   - Click **Git** (left sidebar)

3. **Connect Repository**:
   - You should see "Git Repository" section
   - Click **Connect Git Repository** button
   - If you see "Disconnect", it's already connected - skip to Step 3

4. **Select Your Repository**:
   - Search for: `fnwao/revive`
   - Or select it from the list
   - Click **Connect**

5. **Configure Settings**:
   - **Production Branch**: `main` (or `master`)
   - **Root Directory**: `nextjs-frontend` ⚠️ **IMPORTANT!**
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install --legacy-peer-deps` (or leave default)

6. **Save Settings**:
   - Click **Save** or **Deploy**

## Step 3: Test Automatic Deployment

1. **Make a small change**:
   ```bash
   # Edit any file, for example:
   # Add a comment or change some text
   ```

2. **Commit and push**:
   ```bash
   git add .
   git commit -m "Test: automatic deployment"
   git push
   ```

3. **Check Vercel Dashboard**:
   - Go to: https://vercel.com/dashboard → `revive-silk`
   - You should see a new deployment starting automatically!
   - Wait 1-2 minutes for it to complete

## Step 4: Verify It Works

1. **Check Deployment**:
   - Go to Vercel Dashboard → `revive-silk` → **Deployments** tab
   - You should see a new deployment with your commit message
   - Status should show "Ready" when complete

2. **Check Production URL**:
   - Visit: https://revive-silk-pi.vercel.app
   - Your changes should be live!

## That's It! 🎉

Now every time you:
1. Edit files locally
2. `git commit` and `git push`

Vercel will automatically:
- ✅ Build your app
- ✅ Create a preview deployment
- ✅ Deploy to production (if on `main` branch)

## Troubleshooting

### "Repository not found"
- Make sure you've pushed code to GitHub first
- Check repository name: `fnwao/revive`
- Verify GitHub permissions in Vercel

### "Build failed"
- Check Root Directory is set to: `nextjs-frontend`
- Verify Build Command: `npm run build`
- Check deployment logs in Vercel dashboard

### "No deployments triggered"
- Make sure you're pushing to the `main` branch
- Check Git settings in Vercel dashboard
- Verify repository is connected

---

**Need help?** Check the deployment logs in Vercel dashboard for detailed error messages.


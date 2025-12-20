# Vercel Setup Troubleshooting

## Issue: Vercel Can't Access Repository

### Solution 1: Connect GitHub Account to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** or **"Login"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account
5. Grant permissions to access repositories

### Solution 2: Check Repository Visibility

If your repository is **private**, make sure:
- Vercel has access to private repositories
- You've granted the necessary permissions during GitHub OAuth

### Solution 3: Manual Import Steps

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click "Add New..." → "Project"**
3. **Import Git Repository**:
   - If you don't see your repo, click **"Adjust GitHub App Permissions"**
   - Select the repositories you want to give Vercel access to
   - Or select "All repositories"
4. **Find your repository**: `fnwao/revive`
5. **Click "Import"**

### Solution 4: Check GitHub App Permissions

1. Go to GitHub: https://github.com/settings/installations
2. Find **"Vercel"** in your installed apps
3. Click **"Configure"**
4. Under **"Repository access"**:
   - Select **"All repositories"** OR
   - Select **"Only select repositories"** and add `revive`
5. Click **"Save"**

### Solution 5: Alternative - Deploy via Vercel CLI

If web interface doesn't work, use CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd nextjs-frontend

# Deploy
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set root directory: ./ (or leave default)
# - Override settings: No
```

### Solution 6: Check Repository Name

Make sure the repository exists and is accessible:
- Repository URL: `https://github.com/fnwao/revive`
- Make sure you're logged into the correct GitHub account
- Verify the repository is visible in your GitHub account

## Quick Checklist

- [ ] Vercel account connected to GitHub
- [ ] GitHub OAuth permissions granted
- [ ] Repository is visible in Vercel's import list
- [ ] Repository access permissions configured in GitHub
- [ ] Using the correct GitHub account

## Still Having Issues?

1. **Try disconnecting and reconnecting**:
   - Vercel Dashboard → Settings → Git
   - Disconnect GitHub
   - Reconnect and grant permissions

2. **Check repository settings**:
   - Make sure repository exists: https://github.com/fnwao/revive
   - Check if it's private/public
   - Verify you have admin access

3. **Use Vercel CLI** (most reliable):
   ```bash
   npm i -g vercel
   cd nextjs-frontend
   vercel
   ```


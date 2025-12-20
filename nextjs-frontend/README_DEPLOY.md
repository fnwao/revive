# 🚀 Quick Deploy Guide

## Deploy to Vercel (Easiest - 5 minutes)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push
```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"New Project"**
3. Import your repository
4. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `nextjs-frontend`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
5. Click **"Deploy"**

That's it! Your app will be live in ~2 minutes.

## Environment Variables (Optional)

The app works in **demo mode** by default (no backend needed). 

To connect to a backend:
- Add environment variable: `NEXT_PUBLIC_API_URL` = your backend URL
- Or users can set it in Settings after deployment

## Share Your Link

Once deployed, Vercel will give you a URL like:
- `https://your-app.vercel.app`

Share this link with testers! The app works fully in demo mode.

## Demo Mode Features

✅ Dashboard with statistics  
✅ Revivals management  
✅ Knowledge base  
✅ Settings  
✅ All UI features  

No backend or API key required for testing!

## Troubleshooting

**Build fails?**
- Make sure you're in the `nextjs-frontend` directory
- Run `npm install` first
- Check Node.js version (18+)

**Need help?**
- Check `DEPLOYMENT.md` for detailed instructions


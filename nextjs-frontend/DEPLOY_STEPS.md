# 🚀 Deploy to Vercel - Step by Step

## Step 1: Install Vercel CLI

Run this in your terminal:

```bash
cd "/Users/feminwaojigba/untitled folder/revive-ai/nextjs-frontend"
npm install vercel --save-dev
```

Or install globally (requires sudo):
```bash
npm i -g vercel
```

## Step 2: Login to Vercel

```bash
npx vercel login
```

This will open your browser to authenticate.

## Step 3: Deploy

```bash
npx vercel
```

Follow the prompts:
- **Set up and deploy?** → **Yes**
- **Which scope?** → Select your account
- **Link to existing project?** → **Yes**
- **What's the name of your existing project?** → **revive-silk**
- **In which directory is your code located?** → **./** (press Enter)
- **Want to override the settings?** → **No**

## Step 4: Deploy to Production

After the preview deployment works, deploy to production:

```bash
npx vercel --prod
```

This will deploy to: **https://revive-silk.vercel.app**

## That's It! 🎉

Your app will be live and you can share the link with testers!

---

**Note**: If you installed locally (not globally), use `npx vercel` instead of just `vercel`.


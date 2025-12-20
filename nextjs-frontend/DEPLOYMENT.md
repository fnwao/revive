# Deployment Guide

This guide will help you deploy Revive.ai to a live environment for testing.

## Quick Deploy to Vercel (Recommended)

Vercel is the easiest way to deploy Next.js applications.

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Navigate to the frontend directory:
   ```bash
   cd nextjs-frontend
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts:
   - Link to existing project or create new
   - Set environment variables if needed
   - Deploy!

### Option 2: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import your repository
5. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `nextjs-frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
6. Add Environment Variables (optional):
   - `NEXT_PUBLIC_API_URL`: Your backend API URL (or leave empty for demo mode)
7. Click "Deploy"

## Environment Variables

The app works in **demo mode** by default (no backend required). To connect to a backend:

1. Set `NEXT_PUBLIC_API_URL` environment variable to your backend URL
2. Users can also configure the API URL in Settings after deployment

## Demo Mode

The app works fully in demo mode without any backend:
- ✅ Dashboard with mock statistics
- ✅ Revivals page with sample deals
- ✅ Knowledge base (local storage)
- ✅ All UI features functional
- ✅ Settings and configuration

## Other Deployment Options

### Netlify

1. Go to [netlify.com](https://netlify.com)
2. Connect your repository
3. Build settings:
   - **Build command**: `cd nextjs-frontend && npm run build`
   - **Publish directory**: `nextjs-frontend/.next`
4. Add environment variables if needed
5. Deploy!

### Railway

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repository
4. Set root directory to `nextjs-frontend`
5. Add environment variables
6. Deploy!

### Self-Hosted

1. Build the app:
   ```bash
   cd nextjs-frontend
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

3. The app will run on port 3000 (or PORT environment variable)

## Post-Deployment Checklist

- [ ] Test the app loads correctly
- [ ] Verify demo mode works (no API key needed)
- [ ] Test Settings page
- [ ] Test all navigation links
- [ ] Check mobile responsiveness
- [ ] Share the link with testers!

## Troubleshooting

### Build Errors

If you get build errors:
1. Check Node.js version (should be 18+)
2. Run `npm install` to ensure dependencies are installed
3. Check for TypeScript errors: `npx tsc --noEmit`

### API Connection Issues

- The app works in demo mode without a backend
- Users can configure API URL in Settings after deployment
- Set `NEXT_PUBLIC_API_URL` environment variable for default API URL

### CORS Issues

If connecting to a backend, ensure CORS is configured on the backend to allow your frontend domain.

## Support

For issues or questions, check the main README.md file.


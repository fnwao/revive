# Frontend Setup Guide

## Overview

The Revive.ai frontend is built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and shadcn/ui components.

## Quick Start

### 1. Install Dependencies

```bash
cd nextjs-frontend
npm install
```

**Note:** If you see errors about `@radix-ui/react-toast`, install it:
```bash
npm install @radix-ui/react-toast
```

### 2. Start Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 3. Configure Backend Connection

1. Start the backend server (see `backend/SETUP.md`)
2. Create a user and get your API key:
   ```bash
   cd backend
   python scripts/create_user.py create --email your@email.com
   ```
3. In the frontend, go to **Settings** → **API Configuration**
4. Enter your API key and backend URL (default: `http://localhost:8000`)
5. Click **Save**

## Project Structure

```
nextjs-frontend/
├── app/
│   ├── (app)/              # Protected app routes (requires auth)
│   │   ├── dashboard/       # Main dashboard with stats
│   │   ├── revivals/        # Stalled deals and revival management
│   │   ├── knowledge-base/  # Document upload and management
│   │   ├── pricing/         # Subscription plans
│   │   ├── settings/        # Account and integration settings
│   │   └── layout.tsx       # App layout with sidebar
│   ├── login/               # Login page
│   ├── signup/              # Multi-step signup flow
│   ├── onboarding/          # Tutorial and onboarding
│   ├── layout.tsx           # Root layout with Toaster
│   ├── page.tsx             # Home page (redirects to dashboard)
│   └── globals.css          # Global styles and design system
├── components/
│   ├── layout/
│   │   └── sidebar.tsx      # Main navigation sidebar
│   ├── ui/                  # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── switch.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   └── logo.tsx             # Revive.ai logo component
├── hooks/
│   └── use-toast.ts         # Toast notification hook
├── lib/
│   ├── api.ts               # Backend API client
│   ├── demo-data.ts         # Demo conversation data
│   ├── knowledge-base.ts    # Knowledge base utilities
│   ├── mock-state.ts        # Mock state management
│   ├── subscription.ts      # Subscription management
│   ├── toast.ts             # Toast notification utilities
│   ├── user.ts              # User state management
│   └── utils.ts             # Utility functions
└── package.json
```

## Features

### ✅ Completed Features

- **Authentication Flow**: Signup, login, and onboarding
- **Dashboard**: Revenue metrics, active revivals, pending approvals
- **Revivals Management**: View stalled deals, generate messages, manage conversations
- **Knowledge Base**: Upload, search, and manage documents
- **Settings**: Account, API configuration, GHL integration, notifications
- **Pricing**: Subscription plans with monthly/annual billing
- **Toast Notifications**: Success, error, warning, and info notifications
- **Dark Theme**: Consistent dark mode design system
- **Responsive Design**: Works on mobile and desktop

### 🎨 Design System

- **Colors**: Dark theme with soft contrast (#0F1115 background, #4F8CFF accent)
- **Typography**: Inter font family
- **Components**: shadcn/ui with custom dark theme styling
- **Layout**: ChatGPT/Notion-inspired clean interface

## Development

### Adding New Pages

1. Create a new file in `app/(app)/your-page/page.tsx`
2. The page will automatically be available at `/your-page`
3. Add navigation link in `components/layout/sidebar.tsx`

### Using Toast Notifications

```typescript
import { showToast } from "@/lib/toast"

// Success
showToast.success("Settings saved", "Your changes have been saved.")

// Error
showToast.error("Upload failed", "Please try again.")

// Warning
showToast.warning("Limit reached", "You've reached your plan limit.")

// Info
showToast.info("Processing", "Your request is being processed.")
```

### API Integration

The frontend uses `lib/api.ts` for all backend communication. It automatically:
- Falls back to mock data when no API key is configured
- Handles errors gracefully
- Shows toast notifications for success/error states

## Environment Variables

Create a `.env.local` file in `nextjs-frontend/`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Troubleshooting

### Frontend not loading
- Make sure dependencies are installed: `npm install`
- Check for TypeScript errors: `npm run build`
- Clear `.next` cache: `rm -rf .next`

### API connection issues
- Verify backend is running: `cd backend && uvicorn app.main:app --reload`
- Check API URL in Settings page
- Verify API key is correct
- Check browser console for errors

### Toast notifications not working
- Install missing dependency: `npm install @radix-ui/react-toast`
- Verify `<Toaster />` is in root layout
- Check browser console for errors

## Next Steps

1. Connect to real GoHighLevel API
2. Add authentication (JWT tokens)
3. Implement real-time updates (WebSockets)
4. Add analytics and reporting
5. Implement advanced knowledge base features

# Revive.ai Frontend

> Modern Next.js frontend for AI-powered revenue recovery

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3+-38bdf8)](https://tailwindcss.com)

## Overview

The Revive.ai frontend is a modern Next.js application built with TypeScript, Tailwind CSS, and shadcn/ui components. It provides a clean, ChatGPT/Notion-inspired interface for managing revenue recovery operations.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Backend API running (see [backend/README.md](../backend/README.md))

### Installation

```bash
# Install dependencies
npm install

# Install toast component (if needed)
npm install @radix-ui/react-toast

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
nextjs-frontend/
├── app/
│   ├── (app)/                  # Protected app routes
│   │   ├── dashboard/          # Dashboard page
│   │   ├── revivals/           # Revival management
│   │   ├── knowledge-base/     # Knowledge base
│   │   ├── pricing/            # Pricing/subscription
│   │   ├── settings/           # Settings page
│   │   └── layout.tsx          # App layout with sidebar
│   ├── login/                  # Login page
│   ├── signup/                 # Multi-step signup
│   ├── onboarding/            # Tutorial/onboarding
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home (redirects to dashboard)
│   └── globals.css             # Global styles
├── components/
│   ├── layout/                 # Layout components
│   │   └── sidebar.tsx         # Main navigation sidebar
│   ├── ui/                     # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── switch.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   └── logo.tsx                # Revive.ai logo
├── lib/
│   ├── api.ts                  # API client functions
│   ├── user.ts                 # User state management
│   ├── subscription.ts         # Subscription management
│   ├── demo-data.ts            # Mock data for demo mode
│   ├── toast.ts                # Toast notifications
│   └── utils.ts                # Utility functions
├── hooks/
│   └── use-toast.ts            # Toast hook
├── public/                     # Static assets
├── package.json
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── next.config.js              # Next.js configuration
```

## 🎨 Design System

The frontend uses a custom design system inspired by ChatGPT and Notion:

### Colors

- **Background**: `#0F1115` (dark charcoal)
- **Surface**: `#1B1F2A` (card backgrounds)
- **Border**: `#2A2F3A` (dividers)
- **Primary**: `#4F8CFF` (soft blue accent)
- **Text**: `#F5F7FA` (primary), `#B8BDC9` (secondary)

### Typography

- **Font**: Inter (system fallback)
- **H1**: 36px / 44px / 600
- **H2**: 28px / 36px / 600
- **Body**: 14px / 22px / 400

### Components

All UI components are from [shadcn/ui](https://ui.shadcn.com) and customized for the dark theme.

## 📄 Pages

### Public Pages

- **/** - Home (redirects to dashboard)
- **/signup** - Multi-step signup flow
- **/login** - Login page
- **/onboarding** - Tutorial and onboarding

### Protected Pages (App Routes)

- **/dashboard** - Main dashboard with revenue metrics
- **/revivals** - Manage stalled deals and revivals
- **/knowledge-base** - Upload and manage documents
- **/settings** - Account and integration settings
- **/pricing** - Subscription plans and billing

## 🔌 Backend Integration

### Configuration

1. Go to **Settings** → **API Configuration**
2. Enter your API key (from backend)
3. Enter API URL (default: `http://localhost:8000`)
4. Click **Save**

### API Client

The frontend uses `lib/api.ts` for all backend communication:

```typescript
import { detectStalledDeals, generateMessage, getApprovals } from '@/lib/api'

// Detect stalled deals
const deals = await detectStalledDeals({ pipeline_id: 'pipeline-001' })

// Generate message
const message = await generateMessage(dealId, context)

// Get approvals
const approvals = await getApprovals({ status: 'pending' })
```

### Demo Mode

When no API key is configured, the frontend works in **demo mode** with mock data:
- Dashboard shows demo statistics
- Revivals page shows 12 demo deals
- Knowledge base works with local storage
- All UI features are functional

## 🎯 Features

### ✅ Completed

- ✅ Modern dark theme UI
- ✅ Responsive design
- ✅ Sidebar navigation
- ✅ Dashboard with metrics
- ✅ Revival management interface
- ✅ Knowledge base document upload
- ✅ Settings and configuration
- ✅ Subscription management
- ✅ Toast notification system
- ✅ API integration
- ✅ Demo mode (works without backend)

### 🚧 Planned

- 🔄 Real-time updates
- 🔄 File upload to backend
- 🔄 Advanced filtering
- 🔄 Search functionality

## 🛠️ Development

### Running Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
npm start
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## 📦 Dependencies

### Core

- **next** - React framework
- **react** - UI library
- **typescript** - Type safety

### Styling

- **tailwindcss** - CSS framework
- **@radix-ui/react-*** - UI primitives
- **class-variance-authority** - Component variants
- **clsx** - Class name utilities

### Icons

- **lucide-react** - Icon library

## 🎨 Customization

### Theme Colors

Edit `app/globals.css` to change colors:

```css
:root {
  --background: 15 17 21;      /* #0F1115 */
  --primary: 79 140 255;        /* #4F8CFF */
  /* ... */
}
```

### Components

All UI components are in `components/ui/` and can be customized. They're based on shadcn/ui and fully customizable.

## 🐛 Troubleshooting

### Dependencies Not Installing

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Check for errors
npm run type-check

# Rebuild
npm run build
```

### 404 Errors for Chunks

```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### API Connection Issues

1. Verify backend is running: `curl http://localhost:8000/health`
2. Check API key in Settings
3. Verify API URL matches backend URL
4. Check browser console for errors

### Toast Notifications Not Working

```bash
# Install missing dependency
npm install @radix-ui/react-toast
```

## 📚 Additional Documentation

- **[../FRONTEND_SETUP.md](../FRONTEND_SETUP.md)** - Detailed setup guide
- **[../GETTING_STARTED.md](../GETTING_STARTED.md)** - Quick start guide
- **[../PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md)** - Project organization

## 🚀 Next Steps

1. Connect to real backend API
2. Implement file upload to backend
3. Add real-time updates
4. Add search and filtering
5. Improve error handling
6. Add loading states

---

**For backend setup, see [../backend/README.md](../backend/README.md)**
# Revive.ai - Next.js Frontend

Modern Next.js application for Revive.ai revenue recovery SaaS.

## Tech Stack

- **Next.js 14** - App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Lucide React** - Icons

## Getting Started

### Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
nextjs-frontend/
├── app/
│   ├── (app)/              # Protected app routes
│   │   ├── dashboard/      # Dashboard page
│   │   ├── revivals/       # Revivals management
│   │   ├── knowledge-base/ # Knowledge base
│   │   ├── settings/       # Settings page
│   │   └── layout.tsx      # App layout with sidebar
│   ├── onboarding/         # Onboarding flow
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home (redirects to dashboard)
│   └── globals.css         # Global styles
├── components/
│   ├── layout/             # Layout components
│   │   ├── sidebar.tsx     # Sidebar navigation
│   │   └── header.tsx      # Top header
│   └── ui/                 # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       └── ...
└── lib/
    └── utils.ts            # Utility functions
```

## Pages

- **/** - Redirects to dashboard
- **/onboarding** - Initial setup flow
- **/dashboard** - Main dashboard with metrics
- **/revivals** - Manage revival campaigns
- **/knowledge-base** - Upload and manage documents
- **/settings** - Account and integration settings

## Features

- ✅ Clean, modern SaaS UI
- ✅ Responsive design
- ✅ Sidebar navigation
- ✅ Placeholder content for all pages
- ✅ shadcn/ui components
- ✅ TypeScript support

## Next Steps

- Connect to backend API
- Add authentication
- Implement real data fetching
- Add form handling
- Add error boundaries


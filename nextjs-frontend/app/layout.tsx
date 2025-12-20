import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Revive.ai - Revenue Recovery for GoHighLevel',
  description: 'Revive.ai - AI-powered revenue recovery system that automatically detects and reactivates stalled deals',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-white">
      <body className={`${inter.className} bg-white`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}


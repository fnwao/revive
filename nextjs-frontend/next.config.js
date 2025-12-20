/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use Turbopack (default in Next.js 16) with empty config
  turbopack: {},
  // Enable standalone output for better deployment
  output: 'standalone',
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },
}

module.exports = nextConfig


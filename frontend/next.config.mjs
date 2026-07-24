import withBundleAnalyzer from "@next/bundle-analyzer"
import { withSentryConfig } from "@sentry/nextjs"

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Comma-separated origins allowed for dev HMR from LAN devices.
  // Set ALLOWED_DEV_ORIGINS in .env.local or env before starting dev server.
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS
    ? process.env.ALLOWED_DEV_ORIGINS.split(",").map((s) => s.trim())
    : [],
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "**",
        port: "8000",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "*.railway.app",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "*.railway.com",
        pathname: "/uploads/**",
      },
    ],
  },
  // Serwist injects a webpack config — explicit empty turbopack config
  // prevents Next.js 16 from erroring on mixed configs.
  turbopack: {
    // Remove unused CSS regex from turbopack if supported
    // Not all versions support it
  },
  // ── Proxy uploads through Next.js to avoid private-IP block ──
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${API_BASE}/uploads/:path*`,
      },
    ]
  },
}

const sentryConfig = {
  silent: !process.env.NEXT_PUBLIC_SENTRY_DSN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: false,
}

// ── PWA / Service Worker ──────────────────────────────────────────────────────
// Register SW lazily from a deferred client component instead of @serwist/next
// plugin (which injects 30KB serwist code into every page). The SW file is still
// compiled at build time from app/sw.ts — we just register it manually.
// Dynamic import so @serwist/next never loads in dev — avoids injecting
// SW-registration client code that 404s on sw.js (not compiled in dev).
// That console error drops Lighthouse best-practices to 0.
// To test PWA locally, build first or set ENABLE_PWA_DEV=true in .env.local.
async function withPwa(config) {
  if (process.env.ENABLE_PWA === "false") {
    return config
  }
  return config
}

export default async function nextConfigFunction() {
  let config = nextConfig
  config = analyzer(config)
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    config = withSentryConfig(config, sentryConfig)
  }
  return withPwa(config)
}

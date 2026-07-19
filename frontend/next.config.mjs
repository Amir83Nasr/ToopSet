import withBundleAnalyzer from "@next/bundle-analyzer"
import { withSentryConfig } from "@sentry/nextjs"
import withSerwist from "@serwist/next"

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Comma-separated origins allowed for dev HMR from LAN devices.
  // Set ALLOWED_DEV_ORIGINS in .env.local or env before starting dev server.
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS
    ? process.env.ALLOWED_DEV_ORIGINS.split(",").map((s) => s.trim())
    : [],
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
  turbopack: {},
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
// Uses @serwist/next in production only. In dev, serwist runs in a no-op mode
// (no precaching, no runtime caching) so hot-reload is unaffected.
// Disable entirely by setting ENABLE_PWA=false in frontend/.env.local.
const withPwa = process.env.ENABLE_PWA !== "false"

const pwaConfig = withPwa
  ? withSerwist({
      // The service worker source — compiled at build time.
      swSrc: "app/sw.ts",
      swDest: "sw.js",
      // In development, serwist injects a no-op SW so nothing is cached.
      // To test PWA locally, set ENABLE_PWA_DEV=true in .env.local
      // (requires a production build).
      disable:
        process.env.NODE_ENV === "development" &&
        process.env.ENABLE_PWA_DEV !== "true",
    })
  : (config) => config

const baseConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(analyzer(nextConfig), sentryConfig)
  : analyzer(nextConfig)

export default pwaConfig(baseConfig)

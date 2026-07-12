import withBundleAnalyzer from "@next/bundle-analyzer"
import { withSentryConfig } from "@sentry/nextjs"

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
    ],
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

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(analyzer(nextConfig), sentryConfig)
  : analyzer(nextConfig)

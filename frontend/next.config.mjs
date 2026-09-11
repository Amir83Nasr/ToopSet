import { createHash } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import withBundleAnalyzer from "@next/bundle-analyzer"
import withSerwistInit from "@serwist/next"
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
    formats: ["image/avif", "image/webp"],
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
      // ParsPack object storage — vendor images
      {
        protocol: "https",
        hostname: "*.parspack.net",
        pathname: "/**",
      },
      // Production API uploads
      {
        protocol: "https",
        hostname: "api.toopset.ir",
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
// Compiles app/sw.ts into public/sw.js at build time via @serwist/next.
// Registration is manual + deferred (app/sw-register.tsx, after window load)
// so /sw.js never contends with LCP; hence `register: false` below — the
// plugin still injects its tiny entry (~1.4KB src + @serwist/window) into the
// shared chunk, which is the price of a working offline shell.
// Disabled in dev (turbopack has no SW output, and a dev SW would serve stale
// prod caches on localhost). To test PWA locally, run `pnpm build && pnpm start`.
// Set ENABLE_PWA=false to skip the SW entirely.
function publicPrecacheEntries() {
  const publicDir = new URL("./public/", import.meta.url)
  const entries = []
  const skip = (name) =>
    name.startsWith(".") ||
    name === "sw.js" ||
    name === "sw.js.map" ||
    name.startsWith("swe-worker-")
  const walk = (dirUrl, prefix) => {
    const dirPath = new URL(dirUrl)
    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
      if (skip(entry.name)) continue
      if (entry.isDirectory()) {
        walk(new URL(`${entry.name}/`, dirUrl), `${prefix}${entry.name}/`)
      } else if (entry.isFile()) {
        const fileUrl = new URL(entry.name, dirUrl)
        const hash = createHash("md5")
          .update(readFileSync(fileUrl))
          .digest("hex")
        entries.push({
          url: `/${prefix}${entry.name}`,
          revision: hash.slice(0, 16),
        })
      }
    }
  }
  try {
    walk(publicDir, "")
  } catch {
    // Public dir unreadable — precache just the offline shell below.
  }
  entries.sort((a, b) => (a.url < b.url ? -1 : 1))
  return entries
}

function offlineRevision() {
  try {
    const file = new URL("./app/offline/page.tsx", import.meta.url)
    return createHash("md5")
      .update(readFileSync(file))
      .digest("hex")
      .slice(0, 16)
  } catch {
    return "1.0.1"
  }
}

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable:
    process.env.ENABLE_PWA === "false" ||
    process.env.NODE_ENV === "development",
  // Manual deferred registration (app/sw-register.tsx) — the plugin entry must
  // not auto-register at evaluation time, in front of first paint.
  register: false,
  // A surprise location.reload() on reconnect loses in-flight booking state.
  reloadOnOnline: false,
  // History-patching nav-cache worker: unneeded for this app's offline scope.
  cacheOnNavigation: false,
  // Passing this replaces the plugin's public-dir auto-scan, so include the
  // scan above plus the offline shell (a route, not a file — unscannable).
  additionalPrecacheEntries: [
    ...publicPrecacheEntries(),
    { url: "/offline", revision: offlineRevision() },
  ],
})

export default async function nextConfigFunction() {
  let config = nextConfig
  config = analyzer(config)
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    config = withSentryConfig(config, sentryConfig)
  }
  return withSerwist(config)
}

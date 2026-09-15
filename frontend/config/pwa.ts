// ── PWA Configuration ──────────────────────────────────────────────────────────
// Single source of truth for all PWA-related values.
//
// How to update:
//   1. Change the value here.
//   2. Regenerate PNG icons if icon paths change (`pnpm generate-pwa-icons`).
//   3. The manifest route (/app/manifest.ts) and service worker read from here.
//
// Environment-specific overrides (base URL, etc.) are handled at the route level,
// not in this file — this config is a build-time constant.

export const pwaConfig = {
  // ── App Identity ────────────────────────────────────────────────────────────
  name: "ToopSet",
  shortName: "ToopSet",
  description: "سامانه رزرواسیون مجموعه‌های ورزشی",
  language: "fa-IR",

  // ── Display ─────────────────────────────────────────────────────────────────
  startUrl: "/",
  display: "standalone" as const,
  orientation: "portrait-primary" as const,

  // ── Colors ──────────────────────────────────────────────────────────────────
  // themeColor matches the light/dark meta color tags in layout.tsx.
  // Exact match of Button bg-primary: --primary oklch(0.48 0.12 240) /
  // oklch(0.85 0.08 240), gamut-clipped to sRGB.
  // backgroundColor is used as the splash-screen colour on mobile.
  themeColor: "#00649a",
  themeColorDark: "#000",
  backgroundColor: "#fafafa",

  // ── Icon Paths (relative to /public) ────────────────────────────────────────
  // favicon.svg → browser tab icon. PNGs are generated from logo.jpg
  // (`pnpm generate-pwa-icons`). square.svg → offline splash logo only.
  icons: {
    favicon: "/icons/favicon.svg",
    icon192: "/icons/logo.png",
    icon512: "/icons/logo.png",
    maskable512: "/icons/logo.png",
    appleTouch: "/icons/logo.png",
    splash: "/icons/square.svg",
  } as const,

  // ── PWA Categories ──────────────────────────────────────────────────────────
  categories: ["sports", "booking", "lifestyle"] as const,

  // ── Caching ─────────────────────────────────────────────────────────────────
  // v2: image rule also matches /_next/image optimizer URLs (no extension)
  // and only caches 200/opaque responses — a stale 400 must never stick.
  cacheVersion: "v2",
  cachePrefix: "toopset",

  // ── Runtime Caching Rules ───────────────────────────────────────────────────
  // Each rule is applied top-to-bottom; the first matching rule wins.
  // These are consumed by the service worker (app/sw.ts).
  cachingRules: [
    {
      // Third-party JS/CSS (cdn, analytics, map tiles) — stale-while-revalidate
      // so the page renders instantly even on slow connections.
      label: "Static assets (JS/CSS/WOFF)",
      matcher: /\.(?:js|css|woff2?)\b/,
      strategy: "StaleWhileRevalidate" as const,
      cacheName: "static-assets",
      maxEntries: 80,
      maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
    },
    {
      // Raster/vector images — cache-first for speed.
      // The server returns immutable URLs so revalidation is unnecessary.
      label: "Images (PNG/JPG/SVG/WebP/ICO)",
      matcher: /\.(?:png|jpg|jpeg|gif|svg|webp|ico)\b/,
      strategy: "CacheFirst" as const,
      cacheName: "images",
      maxEntries: 100,
      maxAgeSeconds: 60 * 60 * 24 * 14, // 14 days
    },
    {
      // Web fonts — cache-first, very long TTL.
      // Fonts change rarely and are critical for rendering Persian text.
      label: "Web fonts (WOFF2/TTF/EOT)",
      matcher: /\.(?:woff2?|ttf|eot)\b/,
      strategy: "CacheFirst" as const,
      cacheName: "fonts",
      maxEntries: 20,
      maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
    },
    {
      // Public API endpoints (read-only, non-sensitive) — network-first with
      // cache fallback. Shows stale data when offline instead of nothing.
      label: "Public API GET (courts, sports, cities)",
      matcher: /\/api\/v1\/(?:courts|sports|cities|provinces)(?:\?|$)/,
      strategy: "NetworkFirst" as const,
      cacheName: "api-public",
      maxEntries: 50,
      maxAgeSeconds: 60 * 60, // 1 hour
    },
    {
      // Navigation requests (HTML pages) — network-first.
      // The SW falls back to the offline page when the network is unavailable.
      label: "Navigation (HTML pages)",
      matcher: /^https?:\/\/.*\/[^./?]*$/,
      strategy: "NetworkFirst" as const,
      cacheName: "pages",
      maxEntries: 50,
      maxAgeSeconds: 60 * 60 * 24, // 1 day
    },
  ],

  // ── Sensitive URL Patterns (never cached, network-only) ─────────────────────
  // Matched against request URLs AFTER the caching rules above.
  sensitivePatterns: [
    /\/api\/v1\/auth\//,
    /\/api\/v1\/users\//,
    /\/api\/v1\/bookings/,
    /\/api\/v1\/payments/,
    /\/api\/v1\/otp/,
    /\/api\/v1\/admin\//,
  ],

  // ── Offline Page ────────────────────────────────────────────────────────────
  // Relative path shown when the network is unavailable and no cached page exists.
  offlinePage: "/offline",
} as const

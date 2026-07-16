// ── Service Worker ─────────────────────────────────────────────────────────────
// Compiled at build time by @serwist/next. Runtime caching rules mirror the
// centralized config in config/pwa.ts — keep them in sync.
//
// How caching works:
//   • Precaching: static JS/CSS bundles from the Next.js build are pre-cached
//     automatically (handled by serwist via self.__SW_MANIFEST).
//   • Runtime: API responses, images, fonts, and navigation pages are cached
//     lazily as the user browses. Rules are applied top-to-bottom; the first
//     match wins. Sensitive endpoints (auth, bookings, payments) are never cached.
//
// How to add a new runtime caching rule:
//   1. Import the strategy class from "serwist".
//   2. Add a new object to the runtimeCaching array with matcher and handler.
//   3. Sensitive endpoints → add a NetworkOnly handler before the broader rules.

import {
  Serwist,
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
  ExpirationPlugin,
} from "serwist"
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"

// Type declaration for the build-time precache manifest injected by serwist.
declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: (PrecacheEntry | string)[]
  }
}

// ServiceWorkerGlobalScope is unavailable in the DOM lib used by Next.js
// pages — serwist's internal worker build provides these at compile time.
// Declare self minimally so the type checker sees __SW_MANIFEST + SerwistGlobalConfig.
interface SwScope extends SerwistGlobalConfig {
  __SW_MANIFEST: (PrecacheEntry | string)[]
}
declare const self: SwScope

const CACHE_PREFIX = "toopset"
const CACHE_VERSION = "v1"

// ── Runtime Caching Rules ──────────────────────────────────────────────────────
// Order matters — first match wins.
// Sensitive patterns (NetworkOnly) MUST come first so they never
// accidentally match a broader rule below them.

const runtimeCaching = [
  // ── Sensitive API endpoints — network only, never cached ────────────────────
  { matcher: /\/api\/v1\/auth\//, handler: new NetworkOnly() },
  { matcher: /\/api\/v1\/users\//, handler: new NetworkOnly() },
  { matcher: /\/api\/v1\/bookings/, handler: new NetworkOnly() },
  { matcher: /\/api\/v1\/payments/, handler: new NetworkOnly() },
  { matcher: /\/api\/v1\/otp/, handler: new NetworkOnly() },
  { matcher: /\/api\/v1\/admin\//, handler: new NetworkOnly() },

  // ── Public API GET (courts, sports, cities) — show cached when offline ─────
  {
    matcher: /\/api\/v1\/(?:courts|sports|cities|provinces)(?:\?|$)/,
    handler: new NetworkFirst({
      cacheName: `${CACHE_PREFIX}-api-public-${CACHE_VERSION}`,
      plugins: [
        new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
      ],
    }),
  },

  // ── Web fonts — cache first, very long TTL ─────────────────────────────────
  {
    matcher: /\.(?:woff2?|ttf|eot)\b/,
    handler: new CacheFirst({
      cacheName: `${CACHE_PREFIX}-fonts-${CACHE_VERSION}`,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 60,
        }),
      ],
    }),
  },

  // ── Images (PNG/JPG/SVG/WebP/ICO) — cache first ────────────────────────────
  {
    matcher: /\.(?:png|jpg|jpeg|gif|svg|webp|ico)\b/,
    handler: new CacheFirst({
      cacheName: `${CACHE_PREFIX}-images-${CACHE_VERSION}`,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 14,
        }),
      ],
    }),
  },

  // ── Static JS/CSS — stale-while-revalidate for speed + freshness ───────────
  {
    matcher: /\.(?:js|css)\b/,
    handler: new StaleWhileRevalidate({
      cacheName: `${CACHE_PREFIX}-static-${CACHE_VERSION}`,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 80,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        }),
      ],
    }),
  },

  // ── Navigation (HTML pages) — network-first, fall back to cached page ──────
  {
    matcher: ({ request }: { request: Request }) => request.mode === "navigate",
    handler: new NetworkFirst({
      cacheName: `${CACHE_PREFIX}-pages-${CACHE_VERSION}`,
      plugins: [
        new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }),
      ],
    }),
  },
]

// ── Serwist Instance ───────────────────────────────────────────────────────────
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
})

serwist.addEventListeners()

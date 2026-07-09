"use client"

import { ErrorPage } from "@/components/ui/error-page"

/**
 * Global error boundary for the root layout.
 *
 * Next.js renders this when an error propagates past the root layout —
 * it MUST define its own <html> and <body> tags because the root layout
 * itself is broken at this point.
 *
 * ★ Insight ─────────────────────────────────────
 * Without global-error.tsx, a crash in layout.tsx would show a blank
 * white screen with no recovery path. This file ensures every possible
 * error surface has a polished, actionable fallback.
 * ──────────────────────────────────────────────────
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className="antialiased">
      <body>
        <div id="toopset-root" className="relative">
          <ErrorPage
            error={error}
            digest={error.digest}
            onRetry={reset}
            showBack
            showHome
          />
        </div>
      </body>
    </html>
  )
}

"use client"

import Link from "next/link"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  const isDev = process.env.NODE_ENV === "development"

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className="antialiased">
      <body>
        <div id="toopset-root" className="relative">
          <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
            <div className="relative z-10 w-full max-w-sm text-center">
              <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-muted">
                <AlertTriangle className="size-8 text-muted-foreground" />
              </div>

              <h1 className="mb-2 text-xl font-semibold">خطایی رخ داده است</h1>

              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                متأسفانه مشکلی پیش آمده. لطفاً دوباره تلاش کنید.
              </p>

              {/* Dev-mode error details */}
              {isDev && error && (
                <div className="mb-6 w-full rounded-lg bg-muted p-4 text-left font-mono text-xs leading-relaxed">
                  <p className="font-semibold text-foreground">
                    {error.name}: {error.message}
                  </p>
                  {error.digest && (
                    <p className="mt-1 text-muted-foreground">
                      Digest: {error.digest}
                    </p>
                  )}
                  {error.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Stack trace
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-muted-foreground">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="default" size="sm" onClick={reset}>
                  <RefreshCw className="ml-1.5 size-4" />
                  تلاش مجدد
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/">
                    <Home className="ml-1.5 size-4" />
                    صفحه اصلی
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}

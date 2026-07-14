import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"

/**
 * App-like scroll shell for public pages.
 *
 * Locks the viewport to `h-svh` so the background (grid + noise on <body>)
 * stays fixed.  The `<main>` element is the sole scroll container, with the
 * footer living inside it so both scroll together.
 *
 * ── Layout ────────────────────────────────────────
 *   <div class="flex h-svh flex-col">
 *     <SiteHeader />          ← fixed z-50, out of flow
 *     <main overflow-y-auto>  ← scrollable
 *       <flex pt-16>          ← clear fixed header
 *         {children}
 *       </flex>
 *       <SiteFooter />        ← scrolls with content
 *     </main>
 *   </div>
 * ──────────────────────────────────────────────────
 *
 * Use this in every public (non-dashboard) page by wrapping the page content:
 *
 *   <PublicPageShell>
 *     <section>…</section>
 *   </PublicPageShell>
 */
export function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh flex-col">
      <SiteHeader />
      <main className="relative flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col">
          <div className="flex-1 pt-16">{children}</div>
          <SiteFooter />
        </div>
      </main>
    </div>
  )
}

/**
 * Skip-to-content link for keyboard users.
 * Shows on focus only — invisible otherwise.
 * Relies on each page rendering <main id="main-content"> in JSX.
 */
export function SkipNav() {
  return (
    <a
      href="#main-content"
      className="fixed inset-s-0 top-0 z-9999 -translate-y-full rounded-b-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-all focus:translate-y-0"
    >
      رفتن به محتوای اصلی
    </a>
  )
}

import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Home, RefreshCw } from "lucide-react"

export const metadata: Metadata = {
  title: "آفلاین",
  robots: { index: false, follow: false },
}

// Offline fallback served by the service worker (app/sw.ts `fallbacks`) when a
// document navigation fails and the page has no cached copy. The document URL
// stays the page the user wanted, so an empty-action form retries exactly that
// URL. Keep this page JS-free: it must work even if hydration never runs on
// the fallback document (hence plain <img> and <a>, not next/image / next/link).
export default function OfflinePage() {
  return (
    <main
      aria-label="ToopSet"
      className="flex min-h-dvh items-center justify-center bg-[#fafafa] px-4 dark:bg-black"
    >
      <div className="w-full max-w-sm text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/square.svg"
          alt="توپ‌سِت (ToopSet)"
          width={72}
          height={72}
          className="mx-auto mb-6 size-18"
        />
        <h1 className="mb-2 text-xl font-semibold">
          اتصال به اینترنت برقرار نیست
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          این صفحه قبلاً روی دستگاه شما ذخیره نشده و بدون اینترنت نمایش داده
          نمی‌شود. اتصال خود را بررسی کنید و دوباره تلاش کنید.
        </p>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          {/* Empty action = the current URL, re-requested through the service
              worker's network-first navigation handler. */}
          <form action="">
            <Button type="submit" className="w-full sm:w-auto">
              <RefreshCw className="me-1.5 size-4" />
              تلاش مجدد
            </Button>
          </form>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- JS-free by design (offline fallback) */}
            <a href="/">
              <Home className="me-1.5 size-4" />
              بازگشت به خانه
            </a>
          </Button>
        </div>
      </div>
    </main>
  )
}

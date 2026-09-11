import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ToopSet",
  robots: { index: false, follow: false },
}

// ponytail: static logo splash only; upgrade to retry/status UI when offline UX is specced.
export default function OfflinePage() {
  return (
    <main
      aria-label="ToopSet"
      className="flex min-h-dvh items-center justify-center bg-[#fafafa] dark:bg-black"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/square.svg"
        alt="ToopSet"
        width={192}
        height={192}
        className="h-48 w-48"
      />
    </main>
  )
}

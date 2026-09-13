import { Skeleton } from "@/components/ui/skeleton"

/** Mirrors the contact page: header + title + info cards + message form. */
export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="h-16 animate-pulse border-b bg-muted/20" />
      <main
        id="main-content"
        className="mx-auto w-full max-w-5xl flex-1 px-4 pt-24 pb-12"
      >
        {/* Title */}
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto mt-3 h-4 w-72" />

        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {/* Contact info */}
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="size-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>

          {/* Message form */}
          <div className="space-y-5 md:col-span-2">
            <div className="grid gap-5 sm:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-28 w-full" />
            <div className="flex justify-end">
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="h-16 animate-pulse border-b bg-muted/20" />
      <main className="relative flex-1 pt-16">
        <section className="px-4 py-12 md:py-24">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-10 text-center">
              <Skeleton className="mx-auto h-9 w-64 rounded-lg" />
              <Skeleton className="mx-auto mt-3 h-5 w-80 rounded-lg" />
            </div>
            <div className="rounded-xl border bg-card p-4 md:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-10 flex-1 rounded-lg" />
                <Skeleton className="h-10 w-28 rounded-lg" />
                <Skeleton className="h-10 w-28 rounded-lg" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-9 w-20 rounded-full" />
                ))}
              </div>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-xl border bg-card">
                  <div className="p-6">
                    <div className="flex gap-1.5">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="mt-1 h-5 w-44" />
                    <Skeleton className="mt-1 h-3 w-52" />
                  </div>
                  <div className="px-6 pb-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  </div>
                  <div className="p-6">
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

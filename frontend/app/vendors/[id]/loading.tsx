import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="h-16 animate-pulse border-b bg-muted/20" />
      <main className="relative flex-1 pt-16">
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-20">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="mt-8 h-8 w-40" />
          <Skeleton className="mt-6 h-64 w-full rounded-lg" />
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-44 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="h-16 animate-pulse border-b bg-muted/20" />
      <main id="main-content" className="relative flex-1 pt-16">
        <div className="mx-auto max-w-lg px-4 py-12">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-6 h-48 w-full rounded-xl" />
          <Skeleton className="mt-6 h-10 w-full" />
        </div>
      </main>
    </div>
  )
}

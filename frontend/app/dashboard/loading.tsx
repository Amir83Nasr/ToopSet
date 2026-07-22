import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="h-16 animate-pulse border-b bg-muted/20" />
      <main id="main-content" className="relative flex-1 pt-16">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </main>
    </div>
  )
}

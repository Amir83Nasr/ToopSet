import { Skeleton } from "@/components/ui/skeleton"

/**
 * Simple grid skeleton for the venue search result cards.
 */
export function VendorCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[1.25rem] border-0 bg-card p-0 shadow-sm ring-0"
        >
          <div className="aspect-16/11 bg-muted">
            <Skeleton className="size-full" />
          </div>
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-2/3 rounded-full" />
            <Skeleton className="h-3 w-4/5 rounded-full" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Grid skeleton matching the venue search result card layout.
 * Mirrors the real card: image hero → gradient → rating badge →
 * name / address / price overlaid on the image.
 */
export function VendorCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[1.25rem] border-0 bg-card p-0 shadow-sm ring-0"
        >
          <div className="relative aspect-16/11 overflow-hidden bg-muted">
            {/* Rating badge (top-start) */}
            <div className="absolute start-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1">
              <Skeleton className="size-3.5 rounded-full bg-white/60" />
              <Skeleton className="h-3 w-8 rounded-full bg-white/60" />
            </div>
            {/* Name / address / price overlay (bottom) */}
            <div className="absolute inset-x-0 bottom-0 z-10 space-y-2 p-4">
              <Skeleton className="h-4 w-2/3 rounded-full bg-white/60" />
              <Skeleton className="h-3 w-4/5 rounded-full bg-white/40" />
              <Skeleton className="mt-3 h-9 w-full rounded-lg bg-black/30" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

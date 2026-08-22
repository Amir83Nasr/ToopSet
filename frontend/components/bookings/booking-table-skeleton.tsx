import { Skeleton } from "@/components/ui/skeleton"

interface BookingTableSkeletonProps {
  showRefundStatus?: boolean
}

export function BookingTableSkeleton({
  showRefundStatus = false,
}: BookingTableSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col justify-between overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs ring-1 ring-foreground/10"
        >
          <div>
            {/* Header skeleton */}
            <div className="flex items-start justify-between gap-3 border-b bg-muted/30 p-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4.5 w-36" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>

            {/* Body skeleton */}
            <div className="space-y-3.5 p-4">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-14" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>

              {showRefundStatus && (
                <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-4.5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              )}
            </div>
          </div>

          {/* Footer skeleton */}
          <div className="border-t bg-muted/20 p-3">
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton"
import { VendorCardSkeleton } from "@/components/vendors/vendor-card-skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <Skeleton className="mx-auto h-8 w-64" />
      <Skeleton className="mx-auto mt-3 h-4 w-80" />
      <div className="mt-8 flex flex-wrap gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <VendorCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

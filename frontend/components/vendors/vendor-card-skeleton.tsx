import { Skeleton } from "@/components/ui/skeleton"

/** Simple card skeleton: image + two text lines. */
export function VendorCardSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-md border p-0">
      <Skeleton className="aspect-16/11 w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

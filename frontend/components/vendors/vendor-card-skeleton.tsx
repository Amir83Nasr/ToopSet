import { Skeleton } from "@/components/ui/skeleton"

/** Mirrors the vendor card: image hero + rating badge + bottom overlay (name, address, price). */
export function VendorCardSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-[1.25rem]">
      <div className="relative aspect-16/11">
        <Skeleton className="size-full rounded-none" />

        {/* Rating badge */}
        <Skeleton className="absolute start-3 top-3 h-6 w-14 rounded-full bg-background/80" />

        {/* Bottom overlay: name + address + price */}
        <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
          <Skeleton className="h-5 w-2/3 bg-background/80" />
          <Skeleton className="h-3.5 w-4/5 bg-background/80" />
          <Skeleton className="h-10 w-full rounded-lg bg-background/80" />
        </div>
      </div>
    </div>
  )
}

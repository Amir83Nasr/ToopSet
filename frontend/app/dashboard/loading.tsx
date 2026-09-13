import { Skeleton } from "@/components/ui/skeleton"

/**
 * Generic dashboard page skeleton — title + toolbar + table card.
 * Applies to every dashboard sub-page that doesn't define its own loading.tsx,
 * so sibling navigations inside the dashboard swap to a layout-shaped skeleton
 * instead of a bare spinner.
 */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-10 min-w-40 flex-1" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table card */}
      <div className="min-h-0 flex-1 rounded-xl border bg-card p-4">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
        <Skeleton className="mx-auto mt-4 h-8 w-56" />
      </div>
    </div>
  )
}

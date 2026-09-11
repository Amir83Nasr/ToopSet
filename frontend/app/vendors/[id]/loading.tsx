import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-8">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="mt-8 h-8 w-40" />
      <Skeleton className="mt-6 h-64 w-full" />
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <Skeleton className="h-48 lg:col-span-2" />
        <div className="space-y-6">
          <Skeleton className="h-44" />
          <Skeleton className="h-28" />
        </div>
      </div>
    </div>
  )
}

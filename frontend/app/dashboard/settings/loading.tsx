import { Skeleton } from "@/components/ui/skeleton"

/** Mirrors the profile page: header + "اطلاعات حساب" card with avatar and form. */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-52" />
      </div>

      {/* Profile card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <Skeleton className="size-24 shrink-0 rounded-full" />
          <div className="w-full space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="flex justify-end">
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

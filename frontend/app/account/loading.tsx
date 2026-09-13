import { Skeleton } from "@/components/ui/skeleton"

/** Mirrors the account page: header + profile card + menu section cards. */
export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="h-16 animate-pulse border-b bg-muted/20" />
      <main
        id="main-content"
        className="mx-auto w-full max-w-lg flex-1 px-4 pt-20 pb-8"
      >
        {/* Profile card */}
        <div className="mb-5 rounded-3xl bg-muted/30 p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>

        {/* Menu section cards — icon + label + chevron rows */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, section) => (
            <div
              key={section}
              className="overflow-hidden rounded-2xl border bg-card shadow-sm"
            >
              <div className="border-b px-4 py-2.5">
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex flex-col gap-1 p-2">
                {Array.from({ length: section === 0 ? 2 : 3 }).map((_, row) => (
                  <div
                    key={row}
                    className="flex items-center gap-3 rounded-xl p-3"
                  >
                    <Skeleton className="size-5 rounded-md" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="size-4 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

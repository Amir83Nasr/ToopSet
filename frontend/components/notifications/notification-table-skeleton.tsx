import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function NotificationTableSkeleton() {
  return (
    <div>
      {/* Mobile: stacked cards skeleton */}
      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/10"
          >
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <div className="space-y-1.5 py-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop / tablet: full data table */}
      <Table
        className="min-w-220 table-fixed"
        tableWrapperClassName="hidden md:block"
      >
        <colgroup>
          <col className="w-32" />
          <col className="w-72" />
          <col className="w-28" />
          <col className="w-24" />
          <col className="w-28" />
          <col className="w-20" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">نوع</TableHead>
            <TableHead>پیام</TableHead>
            <TableHead className="text-center">تاریخ</TableHead>
            <TableHead className="text-center">ساعت</TableHead>
            <TableHead className="text-center">وضعیت</TableHead>
            <TableHead className="text-center">عملیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="mx-auto h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-60" />
              </TableCell>
              <TableCell>
                <Skeleton className="mx-auto h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="mx-auto h-4 w-14" />
              </TableCell>
              <TableCell>
                <Skeleton className="mx-auto h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="mx-auto h-8 w-16 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function BookingTableSkeleton() {
  return (
    <div>
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-px bg-border">
              {Array.from({ length: 4 }).map((__, cell) => (
                <div key={cell} className="space-y-2 bg-card px-4 py-3">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
            <div className="border-t bg-muted/10 p-3">
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
      <Table
        className="min-w-[980px] table-fixed"
        tableWrapperClassName="hidden shadow-xs md:block"
      >
        <colgroup>
          <col className="w-[210px]" />
          <col className="w-[135px]" />
          <col className="w-[90px]" />
          <col className="w-[135px]" />
          <col className="w-[145px]" />
          <col className="w-[80px]" />
          <col className="w-[175px]" />
          <col className="w-[220px]" />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-12 px-4">مجموعه</TableHead>
            <TableHead className="h-12 px-4 text-center">تاریخ</TableHead>
            <TableHead className="h-12 px-4 text-center">روز</TableHead>
            <TableHead className="h-12 px-4 text-center">ساعت</TableHead>
            <TableHead className="h-12 px-4 text-center">
              مبلغ پرداختی
            </TableHead>
            <TableHead className="h-12 px-4 text-center">نفرات</TableHead>
            <TableHead className="h-12 px-4 text-center">وضعیت</TableHead>
            <TableHead className="h-12 px-4 text-center">عملیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i} className="h-[76px]">
              <TableCell className="px-4">
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="mx-auto h-4 w-20" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="mx-auto h-4 w-14" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="mx-auto h-4 w-24" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="mx-auto h-4 w-24" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="mx-auto h-4 w-8" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="mx-auto h-5 w-20 rounded-full" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="mx-auto h-4 w-24" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

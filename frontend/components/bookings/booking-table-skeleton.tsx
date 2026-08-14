import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface BookingTableSkeletonProps {
  showRefundStatus?: boolean
}

export function BookingTableSkeleton({ showRefundStatus = false }: BookingTableSkeletonProps) {
  return (
    <div>
      <Table
        className={
          showRefundStatus
            ? "min-w-[1180px] table-fixed"
            : "min-w-[980px] table-fixed"
        }
        tableWrapperClassName="shadow-xs"
      >
        <colgroup>
          <col className="w-[210px]" />
          <col className="w-[135px]" />
          <col className="w-[90px]" />
          <col className="w-[135px]" />
          <col className="w-[145px]" />
          <col className="w-[175px]" />
          {showRefundStatus && <col className="w-[220px]" />}
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
            <TableHead className="h-12 px-4 text-center">وضعیت</TableHead>
            {showRefundStatus && (
              <TableHead className="h-12 px-4 text-center">
                وضعیت عودت
              </TableHead>
            )}
            <TableHead className="h-12 px-4 text-center">عملیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i} className="h-[76px]">
              <TableCell className="px-4 py-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="mx-auto h-4 w-20" />
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="mx-auto h-4 w-12" />
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="mx-auto h-4 w-24" />
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="mx-auto h-4 w-20" />
              </TableCell>
              <TableCell className="px-4 py-3 text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </TableCell>
              {showRefundStatus && (
                <TableCell className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </TableCell>
              )}
              <TableCell className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Skeleton className="h-8 w-20 rounded-md" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

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
      <Table className="min-w-220 table-fixed">
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

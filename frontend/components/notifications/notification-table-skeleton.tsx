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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>نوع</TableHead>
            <TableHead>پیام</TableHead>
            <TableHead>تاریخ</TableHead>
            <TableHead>ساعت</TableHead>
            <TableHead>وضعیت</TableHead>
            <TableHead className="text-right">عملیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-60" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-14" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-16 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

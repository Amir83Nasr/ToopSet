"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChevronLeft,
  ChevronRight,
  Gavel,
} from "lucide-react"

interface Penalty {
  id: number
  user_id: number
  booking_id: number
  amount: number
  reason: string
  created_at: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان"
}

export default function PenaltiesPage() {
  const [penalties, setPenalties] = useState<Penalty[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 20

  const fetchPenalties = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ penalties: Penalty[]; total: number }>(
        `/api/v1/penalties?skip=${page * limit}&limit=${limit}`
      )
      setPenalties(res.penalties)
      setTotal(res.total)
    } catch {
      // not authenticated
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchPenalties()
  }, [fetchPenalties])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">جریمه‌ها</h1>
        <p className="text-muted-foreground">سابقه جریمه‌های شما</p>
      </div>

      {loading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : penalties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Gavel className="size-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">جریمه‌ای ثبت نشده</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              در صورت لغو رزرو در بازه ۲ تا ۲۴ ساعت قبل از شروع سانس، جریمه برای شما ثبت خواهد شد.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>لیست جریمه‌ها</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>مبلغ جریمه</TableHead>
                  <TableHead>علت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {penalties.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(p.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{formatPrice(p.amount)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 mt-4">
                <p className="text-sm text-muted-foreground">
                  صفحه {toPersianDigits(page + 1)} از {toPersianDigits(totalPages)}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    <ChevronRight className="ml-1 size-4" />
                    قبلی
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                    بعدی
                    <ChevronLeft className="mr-1 size-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

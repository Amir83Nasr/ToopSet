"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Eye, Pencil, Building2, MapPin, ChevronLeft, ChevronRight } from "lucide-react"

interface Court {
  id: number
  name: string
  sport_type: string
  address: string
  capacity: number
  is_active: boolean
  average_rating: number
  created_at: string
}

const sportLabels: Record<string, string> = {
  volleyball: "والیبال",
  basketball: "بسکتبال",
  futsal: "فوتسال",
  handball: "هندبال",
}

const sportColors: Record<string, string> = {
  volleyball: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  basketball: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  futsal: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  handball: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
}

export default function CourtsPage() {
  const router = useRouter()
  const [courts, setCourts] = useState<Court[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 20

  const fetchCourts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ courts: Court[]; total: number }>(
        `/api/v1/courts?skip=${page * limit}&limit=${limit}`
      )
      setCourts(res.courts)
      setTotal(res.total)
    } catch {
      // not authenticated
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchCourts()
  }, [fetchCourts])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">زمین‌ها</h1>
          <p className="text-muted-foreground">مدیریت و مشاهده زمین‌های ورزشی</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/courts/create">
            <Plus className="ml-2 size-4" />
            زمین جدید
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام</TableHead>
              <TableHead>ورزش</TableHead>
              <TableHead>آدرس</TableHead>
              <TableHead>ظرفیت</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="text-left">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  در حال بارگذاری...
                </TableCell>
              </TableRow>
            ) : courts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  هنوز زمینی ثبت نشده است
                </TableCell>
              </TableRow>
            ) : (
              courts.map((court) => (
                <TableRow key={court.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-muted-foreground" />
                      {court.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={sportColors[court.sport_type] || ""} variant="secondary">
                      {sportLabels[court.sport_type] || court.sport_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    <div className="flex items-center gap-1">
                      <MapPin className="size-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{court.address}</span>
                    </div>
                  </TableCell>
                  <TableCell>{court.capacity} نفر</TableCell>
                  <TableCell>
                    <Badge variant={court.is_active ? "default" : "secondary"}>
                      {court.is_active ? "فعال" : "غیرفعال"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/courts/${court.id}`}>
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/courts/${court.id}/edit`}>
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              صفحه {page + 1} از {totalPages} — {total} زمین
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronRight className="ml-1 size-4" />
                قبلی
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                بعدی
                <ChevronLeft className="mr-1 size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { toast } from "@/lib/toast"
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  Building2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react"

interface PendingCourt {
  id: number
  name: string
  manager_name: string
  sport_types: string[]
  address: string
  capacity: number
  created_at: string | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

function formatPersianNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(num)
}

export default function AdminPendingCourtsPage() {
  const router = useRouter()
  const [courts, setCourts] = useState<PendingCourt[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const fetchCourts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ courts: PendingCourt[]; total: number }>(
        "/api/v1/admin/pending-courts"
      )
      setCourts(res.courts)
      setTotal(res.total)
    } catch {
      toast.error("خطا در دریافت لیست مجموعه‌های در انتظار تایید")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchCourts(), 0)
    return () => clearTimeout(timer)
  }, [fetchCourts])

  const handleApprove = useCallback(
    async (courtId: number) => {
      setActionLoading(courtId)
      try {
        await api(`/api/v1/admin/courts/${courtId}/approve`, {
          method: "POST",
        })
        toast.success("مجموعه با موفقیت تایید شد")
        fetchCourts()
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "خطا در تایید مجموعه"
        )
      } finally {
        setActionLoading(null)
      }
    },
    [fetchCourts]
  )

  const handleReject = useCallback(
    async (courtId: number) => {
      setActionLoading(courtId)
      try {
        await api(`/api/v1/admin/courts/${courtId}/reject`, {
          method: "POST",
        })
        toast.success("مجموعه رد شد")
        fetchCourts()
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "خطا در رد مجموعه")
      } finally {
        setActionLoading(null)
      }
    },
    [fetchCourts]
  )

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            تایید مجموعه‌ها
          </h1>
          <p className="text-muted-foreground">
            مجموعه‌های در انتظار تایید مدیریت
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCourts}
          disabled={loading}
        >
          <RefreshCw
            className={`ml-1 size-4 ${loading ? "animate-spin" : ""}`}
          />
          بروزرسانی
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : courts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="mb-4 size-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              هیچ مجموعه‌ای در انتظار تایید نیست
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              تمام مجموعه‌ها تایید شده‌اند
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollReveal>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="size-4" />
                {formatPersianNumber(total)} مجموعه در انتظار تایید
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام مجموعه</TableHead>
                    <TableHead>مدیر</TableHead>
                    <TableHead>ورزش‌ها</TableHead>
                    <TableHead>ظرفیت</TableHead>
                    <TableHead>تاریخ ثبت</TableHead>
                    <TableHead className="w-40">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courts.map((court) => (
                    <TableRow
                      key={court.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/dashboard/courts/${court.id}`)
                      }
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 shrink-0 text-muted-foreground" />
                          {court.name}
                        </div>
                      </TableCell>
                      <TableCell>{court.manager_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {court.sport_types.map((sport) => (
                            <Badge
                              key={sport}
                              variant="secondary"
                              className="text-xs"
                            >
                              {sport}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatPersianNumber(court.capacity)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {court.created_at ? formatDate(court.created_at) : "-"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button asChild variant="outline" size="icon-sm">
                                <Link
                                  href={`/courts/${court.id}`}
                                  target="_blank"
                                >
                                  <ExternalLink className="size-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>مشاهده مجموعه</p>
                            </TooltipContent>
                          </Tooltip>
                          <Button
                            variant="default"
                            size="sm"
                            disabled={actionLoading === court.id}
                            onClick={() => handleApprove(court.id)}
                          >
                            <CheckCircle className="ml-1 size-4" />
                            تایید
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === court.id}
                            onClick={() => handleReject(court.id)}
                          >
                            <XCircle className="ml-1 size-4" />
                            رد
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}
    </div>
  )
}

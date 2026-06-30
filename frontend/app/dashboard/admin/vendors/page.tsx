"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { usePaginationLimit } from "@/hooks/use-pagination-limit"
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
import { toPersianDigits } from "@/lib/utils"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { toast } from "@/lib/toast"
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  Building2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react"

interface PendingVendor {
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

export default function AdminPendingVendorsPage() {
  const router = useRouter()
  const [vendors, setVendors] = useState<PendingVendor[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const limit = usePaginationLimit()

  const fetchVendors = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      const res = await api<{ vendors: PendingVendor[]; total: number }>(
        `/api/v1/admin/pending-vendors?${params}`
      )
      setVendors(res.vendors)
      setTotal(res.total)
    } catch {
      toast.error("خطا در دریافت لیست مجموعه‌های در انتظار تایید")
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    const timer = setTimeout(() => fetchVendors(), 0)
    return () => clearTimeout(timer)
  }, [fetchVendors])

  const handleApprove = useCallback(
    async (vendorId: number) => {
      setActionLoading(vendorId)
      try {
        await api(`/api/v1/admin/vendors/${vendorId}/approve`, {
          method: "POST",
        })
        toast.success("مجموعه با موفقیت تایید شد")
        fetchVendors()
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "خطا در تایید مجموعه"
        )
      } finally {
        setActionLoading(null)
      }
    },
    [fetchVendors]
  )

  const handleReject = useCallback(
    async (vendorId: number) => {
      setActionLoading(vendorId)
      try {
        await api(`/api/v1/admin/vendors/${vendorId}/reject`, {
          method: "POST",
        })
        toast.success("مجموعه رد شد")
        fetchVendors()
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "خطا در رد مجموعه")
      } finally {
        setActionLoading(null)
      }
    },
    [fetchVendors]
  )

  return (
    <div className="flex flex-1 flex-col gap-6">
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
          onClick={() => {
            setPage(0)
            fetchVendors()
          }}
          disabled={loading}
        >
          <RefreshCw
            className={`ml-1 size-4 ${loading ? "animate-spin" : ""}`}
          />
          بروزرسانی
        </Button>
      </div>

      {loading ? (
        <Card className="min-h-0 flex-1">
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
      ) : vendors.length === 0 ? (
        <Card className="min-h-0 flex-1">
          <CardContent className="flex h-full flex-col items-center justify-center py-16">
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
          <div className="flex min-h-0 flex-1 flex-col">
            <Card className="flex min-h-0 flex-1 flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldAlert className="size-4" />
                  {formatPersianNumber(total)} مجموعه در انتظار تایید
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-auto p-0 *:data-[slot=table-container]:overflow-visible *:data-[slot=table-container]:rounded-none *:data-[slot=table-container]:border-0">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead>نام مجموعه</TableHead>
                      <TableHead className="w-36">مدیر</TableHead>
                      <TableHead className="w-40">ورزش‌ها</TableHead>
                      <TableHead className="w-16">ظرفیت</TableHead>
                      <TableHead className="w-24">تاریخ ثبت</TableHead>
                      <TableHead className="w-44">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor) => (
                      <TableRow
                        key={vendor.id}
                        className="cursor-pointer"
                        onClick={() =>
                          router.push(`/dashboard/vendors/${vendor.id}`)
                        }
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="size-4 shrink-0 text-muted-foreground" />
                            {vendor.name}
                          </div>
                        </TableCell>
                        <TableCell>{vendor.manager_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {vendor.sport_types.map((sport) => (
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
                          {formatPersianNumber(vendor.capacity)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {vendor.created_at
                            ? formatDate(vendor.created_at)
                            : "-"}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  asChild
                                  variant="outline"
                                  size="icon-sm"
                                >
                                  <Link
                                    href={`/vendors/${vendor.id}`}
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
                              disabled={actionLoading === vendor.id}
                              onClick={() => handleApprove(vendor.id)}
                            >
                              <CheckCircle className="ml-1 size-4" />
                              تایید
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === vendor.id}
                              onClick={() => handleReject(vendor.id)}
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

              {/* Pagination */}
              {total > limit && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    صفحه {toPersianDigits(page + 1)} از{" "}
                    {toPersianDigits(Math.ceil(total / limit))}
                  </p>
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          text="قبلی"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setPage((p) => p - 1)
                          }}
                          className={
                            page === 0 ? "pointer-events-none opacity-50" : ""
                          }
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          text="بعدی"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setPage((p) => p + 1)
                          }}
                          className={
                            page >= Math.ceil(total / limit) - 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </Card>
          </div>
        </ScrollReveal>
      )}
    </div>
  )
}

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { formatPersianDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { TablePagination } from "@/components/ui/pagination"
import { toast } from "@/lib/toast"
import {
  SearchInput,
  DataTableToolbar,
} from "@/components/ui/data-table-toolbar"
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  Building2,
  RefreshCw,
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
  return formatPersianDate(iso)
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
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [sportFilter, setSportFilter] = useState("all")
  const limit = usePaginationLimit()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const filteredVendors = useMemo(() => {
    let result = vendors
    if (sportFilter !== "all") {
      result = result.filter((v) => v.sport_types?.includes(sportFilter))
    }
    if (!debouncedSearch) return result
    const q = debouncedSearch.trim().toLowerCase()
    return result.filter(
      (v) =>
        v.name?.toLowerCase().includes(q) ||
        v.manager_name?.toLowerCase().includes(q)
    )
  }, [vendors, debouncedSearch, sportFilter])

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
            className={`me-1 size-4 ${loading ? "animate-spin" : ""}`}
          />
          بروزرسانی
        </Button>
      </div>

      {/* Search & filter bar */}
      <DataTableToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="جستجوی مجموعه یا مدیر..."
        />
        <div>
          <Select
            value={sportFilter}
            onValueChange={(val) => setSportFilter(val)}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="همه ورزش‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>نوع ورزش</SelectLabel>
                <SelectItem value="all">همه ورزش‌ها</SelectItem>
                <SelectItem value="volleyball">والیبال</SelectItem>
                <SelectItem value="basketball">بسکتبال</SelectItem>
                <SelectItem value="futsal">فوتسال</SelectItem>
                <SelectItem value="handball">هندبال</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </DataTableToolbar>

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
      ) : filteredVendors.length === 0 ? (
        <Card className="min-h-0 flex-1">
          <CardContent className="flex h-full flex-col items-center justify-center py-16">
            <Building2 className="mb-4 size-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              مجموعه‌ای با این جستجو یافت نشد
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollReveal>
          <div className="flex min-h-0 flex-1 flex-col gap-6">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="max-h-full min-h-0 overflow-auto rounded-xl border bg-card">
                <Table
                  className="min-w-270 table-fixed"
                  tableWrapperClassName="overflow-visible rounded-none border-0"
                >
                  <colgroup>
                    <col className="w-52" />
                    <col className="w-40" />
                    <col className="w-48" />
                    <col className="w-24" />
                    <col className="w-28" />
                    <col className="w-60" />
                  </colgroup>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead>نام مجموعه</TableHead>
                      <TableHead>مدیر</TableHead>
                      <TableHead>ورزش‌ها</TableHead>
                      <TableHead className="text-center">ظرفیت</TableHead>
                      <TableHead className="text-center">تاریخ ثبت</TableHead>
                      <TableHead className="text-center">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.map((vendor) => (
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
                        <TableCell className="text-center">
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
                        <TableCell className="text-center text-muted-foreground">
                          {vendor.created_at
                            ? formatDate(vendor.created_at)
                            : "-"}
                        </TableCell>
                        <TableCell
                          className="text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-center gap-2">
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
                              <CheckCircle className="me-1 size-4" />
                              تایید
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === vendor.id}
                              onClick={() => handleReject(vendor.id)}
                            >
                              <XCircle className="me-1 size-4" />
                              رد
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <TablePagination
                page={page}
                totalPages={Math.ceil(total / limit)}
                onPageChange={setPage}
              />
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  )
}

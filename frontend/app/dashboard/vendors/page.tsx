"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { usePaginationLimit } from "@/hooks/use-pagination-limit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  SearchInput,
  DataTableToolbar,
} from "@/components/ui/data-table-toolbar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TablePagination } from "@/components/ui/pagination"
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
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@/components/ui/responsive-alert-dialog"
import { toast } from "@/lib/toast"
import {
  Plus,
  Building2,
  MapPin,
  Star,
  RefreshCw,
  Loader2,
  ToggleRight,
  Trash2,
} from "lucide-react"
import { sportLabels, sportColors } from "@/components/vendors/vendor-shared"

interface Vendor {
  id: number
  name: string
  sport_types: string[]
  address: string
  latitude: number
  longitude: number
  capacity: number
  is_active: boolean
  average_rating: number
  created_at: string
  manager_name?: string
}

export default function VendorsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [sportType, setSportType] = useState("all")
  const [isActive, setIsActive] = useState("all")
  const [loading, setLoading] = useState(true)
  const [deleteVendor, setDeleteVendor] = useState<Vendor | null>(null)
  const [deleting, setDeleting] = useState(false)
  const limit = usePaginationLimit()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const fetchVendors = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (sportType && sportType !== "all") params.set("sport_type", sportType)
      if (isActive && isActive !== "all") params.set("is_active", isActive)

      const res = await api<{ vendors: Vendor[]; total: number }>(
        `/api/v1/vendors?${params}`
      )
      setVendors(res.vendors)
      setTotal(res.total)
    } catch {
      setVendors([])
    } finally {
      setLoading(false)
    }
  }, [page, limit, debouncedSearch, sportType, isActive])

  useEffect(() => {
    const timer = setTimeout(() => fetchVendors(), 0)
    return () => clearTimeout(timer)
  }, [fetchVendors])

  const handleDelete = useCallback(async () => {
    if (!deleteVendor) return
    setDeleting(true)
    try {
      await api(`/api/v1/vendors/${deleteVendor.id}`, { method: "DELETE" })
      toast.success("مجموعه حذف شد")
      setDeleteVendor(null)
      fetchVendors()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در حذف")
    } finally {
      setDeleting(false)
    }
  }, [deleteVendor, fetchVendors])

  const handleToggleActive = useCallback(
    async (vendor: Vendor) => {
      try {
        await api(`/api/v1/vendors/${vendor.id}`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: !vendor.is_active }),
        })
        toast.success(vendor.is_active ? "مجموعه غیرفعال شد" : "مجموعه فعال شد")
        fetchVendors()
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "خطا")
      }
    },
    [fetchVendors]
  )

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            مدیریت مجموعه‌ها
          </h1>
          <p className="text-muted-foreground">
            مدیریت و مشاهده مجموعه‌های ورزشی
          </p>
        </div>
        <div className="flex gap-2">
          {user?.role === "manager" && (
            <Button asChild>
              <Link href="/dashboard/vendors/create">
                <Plus className="me-1.5 size-4" />
                ثبت مجموعه جدید
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => fetchVendors()}>
            <RefreshCw className="me-1.5 size-4" />
            بروزرسانی
          </Button>
        </div>
      </div>

      <DataTableToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="جستجوی مجموعه..."
        />
        <div className="flex gap-2">
          <div>
            <Select
              value={sportType}
              onValueChange={(val) => {
                setSportType(val)
                setPage(0)
              }}
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
          <div>
            <Select
              value={isActive}
              onValueChange={(val) => {
                setIsActive(val)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="همه وضعیت‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>وضعیت</SelectLabel>
                  <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                  <SelectItem value="true">فعال</SelectItem>
                  <SelectItem value="false">غیرفعال</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DataTableToolbar>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="me-2 size-5 animate-spin" />
          در حال بارگذاری...
        </div>
      ) : vendors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <Building2 className="size-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">مجموعه‌ای یافت نشد</p>
            {user?.role === "manager" && (
              <Button asChild>
                <Link href="/dashboard/vendors/create">
                  <Plus className="me-1.5 size-4" />
                  ثبت اولین مجموعه
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="max-h-full min-h-0 overflow-auto rounded-xl border bg-card">
            <Table tableWrapperClassName="overflow-visible rounded-none border-0">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="text-right">نام</TableHead>
                  <TableHead className="text-right">ورزش</TableHead>
                  <TableHead className="text-right">آدرس</TableHead>
                  <TableHead className="text-right">امتیاز</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                  {user?.role === "admin" && (
                    <TableHead className="text-right">مدیر</TableHead>
                  )}
                  <TableHead className="text-right">عملیات</TableHead>
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
                    <TableCell className="text-right font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 shrink-0 text-muted-foreground" />
                        {vendor.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap gap-1">
                        {vendor.sport_types?.map((st) => (
                          <Badge
                            key={st}
                            className={sportColors[st] || ""}
                            variant="secondary"
                          >
                            {sportLabels[st] || st}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-50 truncate text-right">
                      <div className="flex items-center gap-1">
                        <MapPin className="size-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{vendor.address}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        <span>
                          {toPersianDigits(
                            vendor.average_rating?.toFixed(1) || "0.0"
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          vendor.is_active
                            ? "inline-flex items-center gap-1.5 rounded-full bg-status-confirmed-bg px-2.5 py-0.5 text-xs font-medium text-status-confirmed"
                            : "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                        }
                      >
                        <span
                          className={
                            vendor.is_active
                              ? "size-1.5 rounded-full bg-status-confirmed"
                              : "size-1.5 rounded-full bg-muted-foreground"
                          }
                        />
                        {vendor.is_active ? "فعال" : "غیرفعال"}
                      </span>
                    </TableCell>
                    {user?.role === "admin" && (
                      <TableCell className="text-right">
                        {vendor.manager_name || "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {user?.role === "admin" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(vendor)}
                            >
                              <ToggleRight data-icon="inline-start" />
                              {vendor.is_active ? "غیرفعال کردن" : "فعال کردن"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon-sm"
                              onClick={() => setDeleteVendor(vendor)}
                            >
                              <Trash2 size={4} />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      <ResponsiveAlertDialog
        open={!!deleteVendor}
        onOpenChange={(open) => !open && setDeleteVendor(null)}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>حذف مجموعه</ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              آیا از حذف مجموعه «{deleteVendor?.name}» اطمینان دارید؟ این عمل
              قابل بازگشت نیست.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel disabled={deleting}>
              انصراف
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "در حال حذف..." : "حذف مجموعه"}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </div>
  )
}

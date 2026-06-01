"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits, toLocalDateStr, todayStr } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  Plus,
  Building2,
  MapPin,
  Search,
  ChevronLeft,
  ChevronRight,
  Star,
  RefreshCw,
  Loader2,
  ToggleRight,
  Trash2,
} from "lucide-react"
import dynamic from "next/dynamic"

const CourtsMap = dynamic(
  () => import("@/components/map/courts-map").then((m) => m.CourtsMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-xl border bg-muted"
        style={{ height: "400px" }}
      >
        <p className="text-sm text-muted-foreground">در حال بارگذاری نقشه...</p>
      </div>
    ),
  }
)

interface Court {
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

const sportLabels: Record<string, string> = {
  volleyball: "والیبال",
  basketball: "بسکتبال",
  futsal: "فوتسال",
  handball: "هندبال",
}

const sportColors: Record<string, string> = {
  volleyball: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  basketball:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  futsal: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  handball:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
}

export default function CourtsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [courts, setCourts] = useState<Court[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [sportType, setSportType] = useState("all")
  const [isActive, setIsActive] = useState("all")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("table")
  const [deleteCourt, setDeleteCourt] = useState<Court | null>(null)
  const [deleting, setDeleting] = useState(false)
  const limit = 20

  // Debounce search input — 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const fetchCourts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (sportType && sportType !== "all") params.set("sport_type", sportType)
      if (isActive && isActive !== "all") params.set("is_active", isActive)

      const res = await api<{ courts: Court[]; total: number }>(
        `/api/v1/courts?${params}`
      )
      setCourts(res.courts)
      setTotal(res.total)
    } catch {
      setCourts([])
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, sportType, isActive])

  useEffect(() => {
    const timer = setTimeout(() => fetchCourts(), 0)
    return () => clearTimeout(timer)
  }, [fetchCourts])

  const handleDelete = useCallback(async () => {
    if (!deleteCourt) return
    setDeleting(true)
    try {
      await api(`/api/v1/courts/${deleteCourt.id}`, {
        method: "DELETE",
      })
      toast.success("مجموعه حذف شد")
      setDeleteCourt(null)
      fetchCourts()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در حذف")
    } finally {
      setDeleting(false)
    }
  }, [deleteCourt, fetchCourts])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page header */}
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
          <Button variant="outline" onClick={() => fetchCourts()}>
            <RefreshCw className="ml-1.5 size-4" />
            رفرش
          </Button>
        </div>
      </div>

      {/* Search & filter bar */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجوی مجموعه..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="flex gap-2">
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
                <SelectItem value="all">همه ورزش‌ها</SelectItem>
                <SelectItem value="volleyball">والیبال</SelectItem>
                <SelectItem value="basketball">بسکتبال</SelectItem>
                <SelectItem value="futsal">فوتسال</SelectItem>
                <SelectItem value="handball">هندبال</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={isActive}
              onValueChange={(val) => {
                setIsActive(val)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="همه وضعیت‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="true">فعال</SelectItem>
                <SelectItem value="false">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="ml-2 size-5 animate-spin" />
          در حال بارگذاری...
        </div>
      ) : courts.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <Building2 className="size-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">مجموعه‌ای یافت نشد</p>
            {user?.role === "manager" && (
              <Button asChild>
                <Link href="/dashboard/courts/create">
                  <Plus className="ml-1.5 size-4" />
                  ثبت اولین مجموعه
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Courts table */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>ورزش</TableHead>
                <TableHead>آدرس</TableHead>
                <TableHead>امتیاز</TableHead>
                <TableHead>وضعیت</TableHead>
                {user?.role === "admin" && <TableHead>مدیر</TableHead>}
                <TableHead className="text-left">عملیات</TableHead>
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
                      <Building2 className="size-4 text-muted-foreground" />
                      {court.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {court.sport_types?.map((st) => (
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
                  <TableCell className="max-w-[200px] truncate">
                    <div className="flex items-center gap-1">
                      <MapPin className="size-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{court.address}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      <span>
                        {toPersianDigits(
                          court.average_rating?.toFixed(1) || "0.0"
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        court.is_active
                          ? "inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:bg-green-500/15 dark:text-green-400"
                          : "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      <span
                        className={
                          court.is_active
                            ? "size-1.5 rounded-full bg-green-500"
                            : "size-1.5 rounded-full bg-muted-foreground"
                        }
                      />
                      {court.is_active ? "فعال" : "غیرفعال"}
                    </span>
                  </TableCell>
                  {user?.role === "admin" && (
                    <TableCell>
                      {court.manager_name || "—"}
                    </TableCell>
                  )}
                  <TableCell>
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {user?.role === "admin" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await api(`/api/v1/courts/${court.id}`, {
                                  method: "PATCH",
                                  body: JSON.stringify({
                                    is_active: !court.is_active,
                                  }),
                                })
                                toast.success(
                                  court.is_active
                                    ? "مجموعه غیرفعال شد"
                                    : "مجموعه فعال شد"
                                )
                                fetchCourts()
                              } catch (err) {
                                toast.error(
                                  err instanceof ApiError ? err.message : "خطا"
                                )
                              }
                            }}
                          >
                            <ToggleRight data-icon="inline-start" />
                            {court.is_active ? "غیرفعال کردن" : "فعال کردن"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => setDeleteCourt(court)}
                          >
                            <Trash2 data-icon="inline-start" />
                            حذف
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                صفحه {toPersianDigits(page + 1)} از{" "}
                {toPersianDigits(totalPages)}
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
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteCourt}
        onOpenChange={(open) => !open && setDeleteCourt(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مجموعه</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف مجموعه «{deleteCourt?.name}» اطمینان دارید؟ این عمل
              قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "در حال حذف..." : "حذف مجموعه"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

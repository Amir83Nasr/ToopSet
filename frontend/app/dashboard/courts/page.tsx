"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Plus,
  Eye,
  Pencil,
  Building2,
  MapPin,
  Search,
  ChevronLeft,
  ChevronRight,
  Map,
  Star,
  Trash2,
  ToggleLeft,
  ToggleRight,
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
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [refLat, setRefLat] = useState("")
  const [refLon, setRefLon] = useState("")
  const [maxDistance, setMaxDistance] = useState("")
  const limit = 20

  // Debounce search input — 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
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
      if (dateFrom) params.set("date_from", new Date(dateFrom).toISOString())
      if (dateTo) params.set("date_to", new Date(dateTo).toISOString())
      if (priceMin) params.set("price_min", priceMin)
      if (priceMax) params.set("price_max", priceMax)
      if (refLat) params.set("ref_lat", refLat)
      if (refLon) params.set("ref_lon", refLon)
      if (maxDistance) params.set("max_distance_km", maxDistance)

      const res = await api<{ courts: Court[]; total: number }>(
        `/api/v1/courts?${params}`
      )
      setCourts(res.courts)
      setTotal(res.total)
    } catch {
      // not authenticated
    } finally {
      setLoading(false)
    }
  }, [
    page,
    debouncedSearch,
    sportType,
    isActive,
    dateFrom,
    dateTo,
    priceMin,
    priceMax,
    refLat,
    refLon,
    maxDistance,
  ])

  useEffect(() => {
    const timer = setTimeout(() => fetchCourts(), 0)
    return () => clearTimeout(timer)
  }, [fetchCourts])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">زمین‌ها</h1>
          <p className="text-muted-foreground">
            مدیریت و مشاهده زمین‌های ورزشی
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/courts/create">
            <Plus className="ml-2 size-4" />
            زمین جدید
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="جستجوی زمین..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select
          value={sportType}
          onValueChange={(val) => {
            setSportType(val)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
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
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            <SelectItem value="true">فعال</SelectItem>
            <SelectItem value="false">غیرفعال</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value)
            setPage(0)
          }}
          className="w-full sm:w-40"
          placeholder="از تاریخ"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value)
            setPage(0)
          }}
          className="w-full sm:w-40"
          placeholder="تا تاریخ"
        />
        <Input
          type="number"
          value={priceMin}
          onChange={(e) => {
            setPriceMin(e.target.value)
            setPage(0)
          }}
          className="w-full sm:w-28"
          placeholder="حداقل قیمت"
        />
        <Input
          type="number"
          value={priceMax}
          onChange={(e) => {
            setPriceMax(e.target.value)
            setPage(0)
          }}
          className="w-full sm:w-28"
          placeholder="حداکثر قیمت"
        />
        <Input
          type="number"
          step="any"
          value={refLat}
          onChange={(e) => {
            setRefLat(e.target.value)
            setPage(0)
          }}
          className="w-full sm:w-24"
          placeholder="عرض موقعیت"
        />
        <Input
          type="number"
          step="any"
          value={refLon}
          onChange={(e) => {
            setRefLon(e.target.value)
            setPage(0)
          }}
          className="w-full sm:w-24"
          placeholder="طول موقعیت"
        />
        <Input
          type="number"
          value={maxDistance}
          onChange={(e) => {
            setMaxDistance(e.target.value)
            setPage(0)
          }}
          className="w-full sm:w-28"
          placeholder="حداکثر فاصله (km)"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="table">جدول</TabsTrigger>
          <TabsTrigger value="map">
            <Map className="ml-1 size-4" />
            نقشه
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          {loading ? (
            <div className="rounded-xl border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام</TableHead>
                    <TableHead>ورزش</TableHead>
                    <TableHead>آدرس</TableHead>
                    <TableHead>ظرفیت</TableHead>
                    <TableHead>امتیاز</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : courts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Building2 className="size-10 text-muted-foreground" />
                </div>
                <h3 className="mb-1 text-lg font-semibold">
                  هنوز زمینی ثبت نشده
                </h3>
                <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
                  اولین زمین ورزشی را ثبت کنید و مدیریت زمان‌های آن را آغاز
                  کنید.
                </p>
                <Button asChild>
                  <Link href="/dashboard/courts/create">
                    <Plus className="ml-2 size-4" />
                    ایجاد زمین جدید
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام</TableHead>
                    <TableHead>ورزش</TableHead>
                    <TableHead>آدرس</TableHead>
                    <TableHead>ظرفیت</TableHead>
                    <TableHead>امتیاز</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courts.map((court) => (
                    <TableRow key={court.id}>
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
                        {toPersianDigits(court.capacity)} نفر
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
                        <Badge
                          variant={court.is_active ? "default" : "secondary"}
                        >
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
                          {user?.role === "admin" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  try {
                                    await api(
                                      `/api/v1/courts/${court.id}/toggle`,
                                      {
                                        method: "PATCH",
                                        body: JSON.stringify({
                                          is_active: !court.is_active,
                                        }),
                                      }
                                    )
                                    toast.success(
                                      court.is_active
                                        ? "زمین غیرفعال شد"
                                        : "زمین فعال شد"
                                    )
                                    fetchCourts()
                                  } catch (err) {
                                    toast.error(
                                      err instanceof ApiError
                                        ? err.message
                                        : "خطا"
                                    )
                                  }
                                }}
                              >
                                {court.is_active ? (
                                  <ToggleRight className="size-4 text-green-600" />
                                ) : (
                                  <ToggleLeft className="size-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      `آیا از حذف "${court.name}" مطمئن هستید؟`
                                    )
                                  )
                                    return
                                  try {
                                    await api(`/api/v1/courts/${court.id}`, {
                                      method: "DELETE",
                                    })
                                    toast.success("زمین حذف شد")
                                    fetchCourts()
                                  } catch (err) {
                                    toast.error(
                                      err instanceof ApiError
                                        ? err.message
                                        : "خطا در حذف"
                                    )
                                  }
                                }}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    صفحه {toPersianDigits(page + 1)} از{" "}
                    {toPersianDigits(totalPages)} — {toPersianDigits(total)}{" "}
                    زمین
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
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <CourtsMap courts={courts} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

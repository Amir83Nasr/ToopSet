"use client"

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useGeolocation } from "@/hooks/use-geolocation"
import { api } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"
import dynamic from "next/dynamic"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"

const VendorsMap = dynamic(
  () => import("@/components/map/vendors-map").then((m) => m.VendorsMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-xl border bg-muted"
        style={{ height: "500px" }}
      >
        <p className="text-sm text-muted-foreground">در حال بارگذاری نقشه...</p>
      </div>
    ),
  }
)
import {
  Building2,
  Star,
  MapPin,
  Search,
  Users,
  X,
  Navigation,
  Map,
} from "lucide-react"

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
  base_price: number | null
}

const sportLabels: Record<string, string> = {
  volleyball: "والیبال",
  basketball: "بسکتبال",
  futsal: "فوتسال",
  handball: "هندبال",
  football: "فوتبال",
}

function formatPrice(price: number | null): string {
  if (price == null) return "—"
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان"
}

function VendorsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [featuredVendors, setFeaturedVendors] = useState<Vendor[]>([])
  const [total, setTotal] = useState(0)
  const [vendorsLoading, setVendorsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const limit = 12
  const initialized = useRef(false)

  // Filters from URL
  const [searchText, setSearchText] = useState(searchParams.get("q") || "")
  const [selectedSports, setSelectedSports] = useState<string[]>(
    searchParams.get("sports")?.split(",").filter(Boolean) || []
  )
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "default")

  // Map panel visibility toggle
  const [showMap, setShowMap] = useState(true)

  // User geolocation for nearby vendors
  const geo = useGeolocation()
  const [maxDistance] = useState("")
  const [locating, setLocating] = useState(false)
  const userLocation = useMemo(
    () =>
      geo.latitude && geo.longitude
        ? { latitude: geo.latitude, longitude: geo.longitude }
        : null,
    [geo.latitude, geo.longitude]
  )

  // Sync URL -> state on mount
  useEffect(() => {
    if (!initialized.current) {
      setSearchText(searchParams.get("q") || "")
      setSelectedSports(
        searchParams.get("sports")?.split(",").filter(Boolean) || []
      )
      setSortBy(searchParams.get("sort") || "default")
      initialized.current = true
    }
  }, [searchParams])

  // Build API params
  const apiParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set("skip", String(page * limit))
    params.set("limit", String(limit))
    params.set("is_active", "true")
    if (searchText) params.set("search", searchText)
    selectedSports.forEach((st) => params.append("sport_types", st))
    if (sortBy === "price_asc") params.set("sort", "price_asc")
    if (sortBy === "price_desc") params.set("sort", "price_desc")
    if (sortBy === "rating") params.set("sort", "rating")
    if (sortBy === "distance") params.set("sort", "distance")
    // Reference coordinate for distance-based sorting
    if (sortBy === "distance" && userLocation) {
      params.set("ref_lat", String(userLocation.latitude))
      params.set("ref_lon", String(userLocation.longitude))
      if (maxDistance) params.set("max_distance_km", maxDistance)
    }
    return params.toString()
  }, [
    page,
    limit,
    searchText,
    selectedSports,
    sortBy,
    userLocation,
    maxDistance,
  ])

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchText) params.set("q", searchText)
    if (selectedSports.length) params.set("sports", selectedSports.join(","))
    if (sortBy !== "default") params.set("sort", sortBy)
    const qs = params.toString()
    const url = qs ? `/vendors?${qs}` : "/vendors"
    router.replace(url, { scroll: false })
  }, [searchText, selectedSports, sortBy, router])

  const fetchVendors = useCallback(async () => {
    setVendorsLoading(true)
    try {
      const res = await api<{ vendors: Vendor[]; total: number }>(
        `/api/v1/vendors?${apiParams}`
      )
      setFeaturedVendors(res.vendors)
      setTotal(res.total)
    } catch {
      // API may not be available
    } finally {
      setVendorsLoading(false)
    }
  }, [apiParams])

  useEffect(() => {
    const timer = setTimeout(() => fetchVendors(), 0)
    return () => clearTimeout(timer)
  }, [fetchVendors])

  function clearFilters() {
    setSearchText("")
    setSelectedSports([])
    setSortBy("default")
    setPage(0)
  }

  const hasActiveFilters =
    searchText || selectedSports.length > 0 || sortBy !== "default"

  const activeFilterCount =
    (searchText ? 1 : 0) +
    selectedSports.length +
    (sortBy !== "default" ? 1 : 0)

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="relative flex-1 pt-16">
        {/* Search & Filters */}
        <section className="relative overflow-hidden px-4 py-12 md:py-24">
          <div className="relative z-10 mx-auto max-w-7xl px-4">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                جستجوی <span className="text-primary">سالن‌ها</span>
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
                مجموعه ورزشی مورد نظر خود را پیدا کنید
              </p>
            </div>

            <div
              className={`rounded-xl border bg-card p-4 md:p-6 ${
                hasActiveFilters ? "" : ""
              }`}
            >
              {/* Row 1: Search + Sort + Near Me */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="relative">
                    <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="جستجوی نام مجموعه، آدرس..."
                      value={searchText}
                      onChange={(e) => {
                        setSearchText(e.target.value)
                        setPage(0)
                      }}
                      className="pr-9"
                    />
                  </div>
                </div>

                <div>
                  <Select
                    value={sortBy}
                    onValueChange={(v) => {
                      setSortBy(v)
                      setPage(0)
                    }}
                  >
                    <SelectTrigger className="w-35">
                      <SelectValue placeholder="مرتب‌سازی" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectGroup>
                        <SelectLabel>مرتب‌سازی</SelectLabel>
                        <SelectItem value="default">پیش‌فرض</SelectItem>
                        <SelectItem value="price_asc">
                          قیمت: کم به زیاد
                        </SelectItem>
                        <SelectItem value="price_desc">
                          قیمت: زیاد به کم
                        </SelectItem>
                        <SelectItem value="rating">امتیاز</SelectItem>
                        <SelectItem value="distance">نزدیک‌ترین</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant={userLocation ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setLocating(true)
                    setSortBy("distance")
                    setPage(0)
                    if (!userLocation) geo.requestLocation()
                    setTimeout(() => setLocating(false), 3000)
                  }}
                  disabled={locating}
                >
                  <Navigation
                    className={`size-4 ${locating ? "animate-spin" : ""}`}
                  />
                  {userLocation ? "نزدیک به من" : "موقعیت من"}
                </Button>

                <Button
                  variant={showMap ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowMap((v) => !v)}
                >
                  <Map className="size-4" />
                  {showMap ? "مخفی کردن نقشه" : "نمایش نقشه"}
                </Button>
              </div>

              {/* Row 2: Sport type pills */}
              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    "all",
                    "volleyball",
                    "basketball",
                    "futsal",
                    "handball",
                    "football",
                  ] as const
                ).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (type === "all") {
                        setSelectedSports([])
                      } else {
                        setSelectedSports((prev) =>
                          prev.includes(type)
                            ? prev.filter((t) => t !== type)
                            : [...prev, type]
                        )
                      }
                      setPage(0)
                    }}
                    className={`rounded-full px-4 ${
                      type === "all"
                        ? selectedSports.length === 0
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        : selectedSports.includes(type)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {type === "all" ? "همه" : sportLabels[type]}
                  </Button>
                ))}
              </div>

              {/* ── Collapsible map panel ── */}
              {showMap && (
                <div className="mt-4 overflow-hidden rounded-xl border">
                  <VendorsMap
                    vendors={featuredVendors}
                    height="400px"
                    userLocation={userLocation}
                  />
                </div>
              )}

              {/* Geo status — moved from old map section */}
              {(geo.loading || geo.error) && (
                <div className="mt-3">
                  {geo.loading && (
                    <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                      <div className="size-2 animate-pulse rounded-full bg-blue-500" />
                      در حال دریافت موقعیت شما...
                    </div>
                  )}
                  {geo.error && (
                    <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 shrink-0" />
                        <span>
                          موقعیت‌یابی غیرفعال است — مجموعه‌های نزدیک نمایش داده
                          نمی‌شوند
                        </span>
                      </div>
                      {geo.permissionState === "denied" && (
                        <span className="text-xs text-muted-foreground">
                          فعال‌سازی در تنظیمات مرورگر
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Filter chips */}
              {hasActiveFilters && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
                  {searchText && (
                    <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-1 text-xs">
                      <Search className="size-3" />
                      {searchText}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setSearchText("")}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </Button>
                    </span>
                  )}
                  {selectedSports.map((st) => (
                    <span
                      key={st}
                      className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-1 text-xs"
                    >
                      {sportLabels[st] || st}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          setSelectedSports((prev) =>
                            prev.filter((t) => t !== st)
                          )
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </Button>
                    </span>
                  ))}

                  {/* Clear all */}
                  <span className="mx-0.5 h-4 w-px bg-border" />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={clearFilters}
                    className=""
                  >
                    <X />
                    پاک کردن همه فیلتر‌ها
                  </Button>
                </div>
              )}
            </div>

            {/* ── Results grid ── */}
            <div className="mt-6">
              {/* Results count */}
              <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {toPersianDigits(total)} مجموعه پیدا شد
                  {hasActiveFilters && (
                    <span className="mr-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {toPersianDigits(activeFilterCount)} فیلتر
                    </span>
                  )}
                </p>
              </div>

              {vendorsLoading ? (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <div className="flex gap-1.5">
                          <Skeleton className="h-5 w-14 rounded-full" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <Skeleton className="mt-1 h-5 w-44" />
                        <Skeleton className="mt-1 h-3 w-52" />
                      </CardHeader>
                      <CardFooter>
                        <div className="flex w-full items-center justify-between">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-10" />
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : featuredVendors.length === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-xl border bg-card py-20 text-center">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                    <Building2 className="size-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg text-muted-foreground">
                    هیچ مجموعه‌ای با فیلترهای انتخاب شده یافت نشد
                  </p>
                  <Button variant="outline" onClick={clearFilters}>
                    پاک کردن فیلترها
                  </Button>
                </div>
              ) : (
                <>
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    variants={{
                      visible: { transition: { staggerChildren: 0.05 } },
                    }}
                    className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
                  >
                    {featuredVendors.map((vendor) => (
                      <motion.div
                        key={vendor.id}
                        variants={{
                          hidden: { opacity: 0, y: 8 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <Link
                          href={`/vendors/${vendor.id}`}
                          className="group block"
                        >
                          <Card className="transition-shadow duration-150 hover:shadow-md">
                            <CardHeader>
                              {/* Sport badges */}
                              <div className="flex flex-wrap gap-1.5">
                                {vendor.sport_types?.map((st) => (
                                  <Badge
                                    key={st}
                                    className="shrink-0 bg-muted-foreground/10 text-[10px] text-muted-foreground"
                                    variant="secondary"
                                  >
                                    {sportLabels[st]}
                                  </Badge>
                                ))}
                              </div>

                              {/* Name */}
                              <CardTitle className="mt-1.5 text-base leading-snug transition-colors duration-150 group-hover:text-primary">
                                {vendor.name}
                              </CardTitle>

                              {/* Address */}
                              <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                                <span className="line-clamp-1">
                                  {vendor.address}
                                </span>
                              </p>
                            </CardHeader>

                            {/* Info row: capacity + rating */}
                            <CardContent className="py-0">
                              <div className="flex items-center justify-between gap-2 pt-3">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Users className="size-3.5" />
                                  <span>
                                    ظرفیت {toPersianDigits(vendor.capacity)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-semibold">
                                  <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                                  <span className="tabular-nums">
                                    {toPersianDigits(
                                      vendor.average_rating.toFixed(1)
                                    )}
                                  </span>
                                </div>
                              </div>
                            </CardContent>

                            {/* Price — minimum slot price */}
                            {vendor.base_price != null && (
                              <CardFooter>
                                <div className="w-full rounded-lg bg-primary/5 px-3 py-2.5">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="inline-flex items-center rounded bg-primary/10 px-1 py-0.5 text-[11px] leading-none font-semibold text-primary">
                                      شروع قیمت از
                                    </span>
                                    <span className="text-sm font-bold text-primary">
                                      {formatPrice(vendor.base_price)}
                                    </span>
                                  </div>
                                </div>
                              </CardFooter>
                            )}
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Pagination — admin dashboard style */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-2 py-3">
                      <p className="text-sm text-muted-foreground">
                        صفحه {toPersianDigits(page + 1)} از{" "}
                        {toPersianDigits(totalPages)}
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
                                page === 0
                                  ? "pointer-events-none opacity-50"
                                  : ""
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
                                page >= totalPages - 1
                                  ? "pointer-events-none opacity-50"
                                  : ""
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

export default function VendorsPage() {
  return (
    <Suspense fallback={null}>
      <VendorsPageContent />
    </Suspense>
  )
}

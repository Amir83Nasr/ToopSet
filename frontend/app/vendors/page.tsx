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
import Image from "next/image"
import { useGeolocation } from "@/hooks/use-geolocation"
import { api, buildVendorImageUrl } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
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
import { Card } from "@/components/ui/card"
import { TablePagination } from "@/components/ui/pagination"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { VendorCardSkeleton } from "@/components/vendors/vendor-card-skeleton"
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
  X,
  Navigation,
  Map,
  CalendarCheck,
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
  images?: string[]
  main_image?: string | null
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

  // Full filtered set for map markers (not paginated)
  const [mapVendors, setMapVendors] = useState<Vendor[]>([])
  const initialized = useRef(false)

  // Filters from URL
  const [searchText, setSearchText] = useState(searchParams.get("q") || "")
  const [selectedSports, setSelectedSports] = useState<string[]>(
    searchParams.get("sports")?.split(",").filter(Boolean) || []
  )
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "default")
  const [availableToday, setAvailableToday] = useState(
    searchParams.get("available_today") === "1"
  )

  // Map panel visibility toggle — hidden by default
  const [showMap, setShowMap] = useState(false)

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
      setAvailableToday(searchParams.get("available_today") === "1")
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
    if (availableToday) params.set("available_today", "true")
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
    availableToday,
    sortBy,
    userLocation,
    maxDistance,
  ])

  // Same filters but no pagination — fetches all filtered vendors for the map
  const mapApiParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set("limit", "100")
    params.set("is_active", "true")
    if (searchText) params.set("search", searchText)
    selectedSports.forEach((st) => params.append("sport_types", st))
    if (availableToday) params.set("available_today", "true")
    if (sortBy === "price_asc") params.set("sort", "price_asc")
    if (sortBy === "price_desc") params.set("sort", "price_desc")
    if (sortBy === "rating") params.set("sort", "rating")
    if (sortBy === "distance") params.set("sort", "distance")
    if (sortBy === "distance" && userLocation) {
      params.set("ref_lat", String(userLocation.latitude))
      params.set("ref_lon", String(userLocation.longitude))
      if (maxDistance) params.set("max_distance_km", maxDistance)
    }
    return params.toString()
  }, [
    searchText,
    selectedSports,
    availableToday,
    sortBy,
    userLocation,
    maxDistance,
  ])

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchText) params.set("q", searchText)
    if (selectedSports.length) params.set("sports", selectedSports.join(","))
    if (availableToday) params.set("available_today", "1")
    if (sortBy !== "default") params.set("sort", sortBy)
    const qs = params.toString()
    const url = qs ? `/vendors?${qs}` : "/vendors"
    router.replace(url, { scroll: false })
  }, [searchText, selectedSports, availableToday, sortBy, router])

  const fetchVendors = useCallback(async () => {
    setVendorsLoading(true)
    try {
      const [pagedRes, allRes] = await Promise.all([
        api<{ vendors: Vendor[]; total: number }>(
          `/api/v1/vendors?${apiParams}`
        ),
        api<{ vendors: Vendor[] }>(`/api/v1/vendors?${mapApiParams}`),
      ])
      setFeaturedVendors(pagedRes.vendors)
      setTotal(pagedRes.total)
      setMapVendors(allRes.vendors)
    } catch {
      // API may not be available
    } finally {
      setVendorsLoading(false)
    }
  }, [apiParams, mapApiParams])

  useEffect(() => {
    const timer = setTimeout(() => fetchVendors(), 0)
    return () => clearTimeout(timer)
  }, [fetchVendors])

  function clearFilters() {
    setSearchText("")
    setSelectedSports([])
    setAvailableToday(false)
    setSortBy("default")
    setPage(0)
  }

  const hasActiveFilters =
    searchText ||
    selectedSports.length > 0 ||
    availableToday ||
    sortBy !== "default"

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main id="main-content" className="relative flex-1 pt-16">
        {/* Search & Filters */}
        <section className="relative overflow-hidden px-4 py-6 md:py-8">
          <div className="relative z-10 mx-auto max-w-7xl px-4">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                جستجوی <span className="text-primary">سالن‌ها</span>
              </h1>
              <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground max-sm:hidden">
                مجموعه ورزشی مورد نظر خود را پیدا کنید
              </p>
            </div>

            <div
              className={`rounded-xl border bg-card p-3 md:p-4 ${
                hasActiveFilters ? "" : ""
              }`}
            >
              {/* Row 1: Search + Sort + Near Me */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="min-w-0 flex-1 max-sm:basis-full">
                  <div className="relative">
                    <Search className="absolute inset-e-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="جستجوی نام مجموعه، آدرس..."
                      value={searchText}
                      onChange={(e) => {
                        setSearchText(e.target.value)
                        setPage(0)
                      }}
                      className="pe-10"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={sortBy}
                    onValueChange={(v) => {
                      setSortBy(v)
                      setPage(0)
                    }}
                  >
                    <SelectTrigger className="w-32 sm:w-35">
                      <SelectValue placeholder="مرتب‌سازی" />
                    </SelectTrigger>
                    <SelectContent>
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
                  className="gap-1.5 max-sm:px-2"
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
                  <span className="max-sm:hidden">
                    {userLocation ? "نزدیک به من" : "موقعیت من"}
                  </span>
                </Button>

                <Button
                  variant={showMap ? "default" : "outline"}
                  size="sm"
                  className="max-sm:px-2"
                  onClick={() => setShowMap((v) => !v)}
                >
                  <Map className="size-4" />
                  <span>{showMap ? "مخفی کردن نقشه" : "نمایش نقشه"}</span>
                </Button>
              </div>

              {/* Row 2: Sport type pills */}
              <div className="mt-3 flex flex-wrap gap-2 max-sm:mt-2 max-sm:flex-nowrap max-sm:gap-1.5 max-sm:overflow-x-auto max-sm:pb-1">
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
                    className={`rounded-full px-4 max-sm:shrink-0 ${
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAvailableToday((current) => !current)
                    setPage(0)
                  }}
                  className={`rounded-full px-4 max-sm:shrink-0 ${
                    availableToday
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  <CalendarCheck className="size-4" />
                  سانس خالی امروز
                </Button>
              </div>

              {/* ── Collapsible map panel ── */}
              {showMap && (
                <div className="mt-2 overflow-hidden rounded-xl border">
                  <VendorsMap
                    vendors={mapVendors}
                    height="400px"
                    userLocation={userLocation}
                  />
                </div>
              )}

              {/* Geo status — moved from old map section */}
              {(geo.loading || geo.error) && (
                <div className="mt-2 max-sm:mt-1.5">
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
                <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2">
                  {/* Clear all — always first */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={clearFilters}
                    className=""
                  >
                    <X />
                    پاک کردن همه فیلتر‌ها
                  </Button>
                  {searchText && (
                    <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 text-xs">
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
                      className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 text-xs"
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
                  {availableToday && (
                    <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 text-xs">
                      <CalendarCheck className="size-3" />
                      سانس خالی امروز
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setAvailableToday(false)}
                        aria-label="حذف فیلتر سانس خالی امروز"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </Button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── Results grid ── */}
            <div className="mt-4">
              {vendorsLoading ? (
                <VendorCardSkeleton />
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
                  <ScrollReveal
                    stagger={0.04}
                    animation="fade-in-up"
                    className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                  >
                    {featuredVendors.map((vendor) => {
                      const mainImage =
                        vendor.main_image || vendor.images?.[0] || null
                      const rating =
                        vendor.average_rating != null &&
                        vendor.average_rating > 0
                          ? vendor.average_rating.toFixed(1)
                          : null

                      return (
                        <div key={vendor.id}>
                          <Link
                            href={`/vendors/${vendor.id}`}
                            className="group block"
                          >
                            <Card className="gap-0 overflow-hidden rounded-[1.25rem] border-0 bg-card p-0 shadow-sm ring-0 transition-[transform,box-shadow] duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-xl">
                              {/* ── Image hero ── */}
                              <div className="relative aspect-16/11 overflow-hidden bg-muted">
                                {mainImage ? (
                                  <Image
                                    src={buildVendorImageUrl(mainImage)}
                                    alt={`عکس اصلی ${vendor.name}`}
                                    fill
                                    priority
                                    className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex size-full items-center justify-center">
                                    <Building2 className="size-10 text-muted-foreground/40" />
                                  </div>
                                )}

                                {/* Bottom gradient for text legibility */}
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />

                                {/* Rating badge */}
                                {rating && (
                                  <div className="absolute start-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white shadow-md backdrop-blur-sm">
                                    <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                                    <span className="tabular-nums">
                                      {toPersianDigits(rating)}
                                    </span>
                                  </div>
                                )}

                                {/* Name + address + price overlayed on image */}
                                <div className="absolute inset-x-0 bottom-0 z-10 p-4">
                                  <h3 className="text-base leading-snug font-bold text-white drop-shadow-sm">
                                    {vendor.name}
                                  </h3>
                                  <p className="mt-1.5 flex items-center gap-1 text-xs text-white/75">
                                    <MapPin className="size-3.5 shrink-0" />
                                    <span className="line-clamp-1">
                                      {vendor.address}
                                    </span>
                                  </p>

                                  {/* Price — minimum slot price */}
                                  {vendor.base_price != null && (
                                    <div className="mt-3 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 backdrop-blur-md">
                                      <div className="flex items-center justify-center gap-1">
                                        <span className="inline-flex items-center rounded bg-white/15 px-1 py-0.5 text-[11px] leading-none font-semibold text-white">
                                          شروع قیمت از
                                        </span>
                                        <span className="text-sm font-bold text-white">
                                          {formatPrice(vendor.base_price)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          </Link>
                        </div>
                      )
                    })}
                  </ScrollReveal>

                  <TablePagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
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

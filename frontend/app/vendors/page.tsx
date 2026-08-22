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
        style={{ height: "450px" }}
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

function formatPrice(price: number | null): string {
  if (price == null) return "—"
  const formattedNumber = new Intl.NumberFormat("fa-IR", {
    useGrouping: true,
  })
    .format(price)
    .replace(/,/g, "٬")
  return `${formattedNumber} تومانءء`
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
  const [mapLoading, setMapLoading] = useState(false)
  const initialized = useRef(false)

  // Filters from URL
  const [searchText, setSearchText] = useState(searchParams.get("q") || "")
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "default")
  const [availableToday, setAvailableToday] = useState(
    searchParams.get("available_today") === "1"
  )

  // Map panel visibility toggle — hidden by default
  const [showMap, setShowMap] = useState(false)

  // Sync URL -> state on mount
  useEffect(() => {
    if (!initialized.current) {
      setSearchText(searchParams.get("q") || "")
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
    if (availableToday) params.set("available_today", "true")
    if (sortBy === "price_asc") params.set("sort", "price_asc")
    if (sortBy === "price_desc") params.set("sort", "price_desc")
    if (sortBy === "rating") params.set("sort", "rating")
    if (sortBy === "distance") params.set("sort", "distance")
    return params.toString()
  }, [page, limit, searchText, availableToday, sortBy])

  // Same filters but no pagination — fetches all filtered vendors for the map
  const mapApiParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set("limit", "100")
    params.set("is_active", "true")
    if (searchText) params.set("search", searchText)
    if (availableToday) params.set("available_today", "true")
    if (sortBy === "price_asc") params.set("sort", "price_asc")
    if (sortBy === "price_desc") params.set("sort", "price_desc")
    if (sortBy === "rating") params.set("sort", "rating")
    if (sortBy === "distance") params.set("sort", "distance")
    return params.toString()
  }, [searchText, availableToday, sortBy])

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchText) params.set("q", searchText)
    if (availableToday) params.set("available_today", "1")
    if (sortBy !== "default") params.set("sort", sortBy)
    const qs = params.toString()
    const url = qs ? `/vendors?${qs}` : "/vendors"
    router.replace(url, { scroll: false })
  }, [searchText, availableToday, sortBy, router])

  const fetchVendors = useCallback(async () => {
    setVendorsLoading(true)
    try {
      const pagedRes = await api<{ vendors: Vendor[]; total: number }>(
        `/api/v1/vendors?${apiParams}`
      )
      setFeaturedVendors(pagedRes.vendors)
      setTotal(pagedRes.total)
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

  // Fetch full filtered vendors list for the map
  const fetchMapVendors = useCallback(async () => {
    setMapLoading(true)
    try {
      const res = await api<{ vendors: Vendor[]; total: number }>(
        `/api/v1/vendors?${mapApiParams}`
      )
      setMapVendors(res.vendors || [])
    } catch {
      setMapVendors((current) =>
        current.length === 0 ? featuredVendors : current
      )
    } finally {
      setMapLoading(false)
    }
  }, [mapApiParams, featuredVendors])

  useEffect(() => {
    if (!showMap) return
    const timer = setTimeout(() => fetchMapVendors(), 0)
    return () => clearTimeout(timer)
  }, [showMap, fetchMapVendors])

  function clearFilters() {
    setSearchText("")
    setAvailableToday(false)
    setSortBy("default")
    setPage(0)
  }

  const hasActiveFilters = searchText || availableToday || sortBy !== "default"

  const totalPages = Math.ceil(total / limit)
  const vendorsForMap = mapVendors.length > 0 ? mapVendors : featuredVendors

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
              {/* Row 1: Search + Sort + Near Me + Map Toggle */}
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
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant={availableToday ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setAvailableToday((current) => !current)
                    setPage(0)
                  }}
                  className="gap-1.5 max-sm:px-2"
                >
                  <CalendarCheck className="size-4" />
                  <span>سانس خالی امروز</span>
                </Button>

                <Button
                  variant={showMap ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5 max-sm:px-2"
                  onClick={() => setShowMap((prev) => !prev)}
                >
                  <Map className="size-4" />
                  <span>{showMap ? "بستن نقشه" : "نمایش نقشه"}</span>
                </Button>
              </div>

              {/* ── Interactive Inline Map Panel ── */}
              {showMap && (
                <div className="mt-4 overflow-hidden rounded-2xl border bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Map className="size-4 text-primary" />
                      <span>
                        نقشه مجموعه‌های ورزشی (
                        {toPersianDigits(vendorsForMap.length)} مجموعه)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMap(false)}
                      className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                      بستن نقشه
                    </Button>
                  </div>
                  <div className="h-[380px] sm:h-[480px]">
                    <VendorsMap
                      vendors={vendorsForMap}
                      loading={mapLoading}
                      height="100%"
                      userLocation={null}
                    />
                  </div>
                </div>
              )}

              {/* Filter chips */}
              {hasActiveFilters && (
                <div className="mt-2 flex items-center gap-1.5 border-t pt-2 max-sm:max-w-full max-sm:flex-nowrap max-sm:gap-1 max-sm:overflow-x-auto max-sm:pb-1">
                  {/* Clear all — always first */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={clearFilters}
                    className="max-sm:shrink-0"
                  >
                    <X />
                    پاک کردن همه فیلتر‌ها
                  </Button>
                  {searchText && (
                    <span className="inline-flex h-10 items-center gap-1 rounded-full border bg-muted/50 ps-3.5 pe-1.5 text-sm max-sm:shrink-0 md:h-8 md:text-xs">
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

                  {availableToday && (
                    <span className="inline-flex h-10 items-center gap-1 rounded-full border bg-muted/50 ps-3.5 pe-1.5 text-sm max-sm:shrink-0 md:h-8 md:text-xs">
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

            {/* Vendor Cards Grid */}
            <div className="mt-8">
              {vendorsLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <VendorCardSkeleton key={i} />
                  ))}
                </div>
              ) : featuredVendors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 rounded-full bg-muted p-4">
                    <Building2 className="size-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">
                    مجموعه‌ای با این مشخصات یافت نشد
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={clearFilters}
                    >
                      پاک کردن همه فیلترها
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <ScrollReveal
                    stagger={0.04}
                    animation="fade-in-up"
                    threshold={0}
                    className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                  >
                    {featuredVendors.map((vendor) => {
                      const mainImage = vendor.main_image || vendor.images?.[0]
                      const rating =
                        vendor.average_rating > 0
                          ? vendor.average_rating.toFixed(1)
                          : null

                      return (
                        <div key={vendor.id}>
                          <Link
                            href={`/vendors/${vendor.id}`}
                            prefetch={false}
                            className="group block"
                          >
                            <Card className="gap-0 overflow-hidden rounded-[1.25rem] border-0 bg-card p-0 shadow-sm ring-0 transition-shadow duration-300 ease-out group-hover:shadow-xl">
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

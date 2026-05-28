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
import { useAuth } from "@/hooks/use-auth"
import { useGeolocation } from "@/hooks/use-geolocation"
import { api } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FavoriteButton } from "@/components/courts/favorite-button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import dynamic from "next/dynamic"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { HeroSection } from "@/components/public/hero-section"
import { AboutSection } from "@/components/public/about-section"
import { RolesSection } from "@/components/public/roles-section"
import { HowItWorks } from "@/components/public/how-it-works"

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
import {
  Building2,
  CalendarDays,
  CreditCard,
  Star,
  MapPin,
  Users,
  SlidersHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"

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
  base_price: number | null
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

function formatPrice(price: number | null): string {
  if (price == null) return "—"
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان"
}

function HomePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, isAuthenticated } = useAuth()

  const [featuredCourts, setFeaturedCourts] = useState<Court[]>([])
  const [total, setTotal] = useState(0)
  const [courtsLoading, setCourtsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const limit = 12
  const initialized = useRef(false)

  // Filters from URL
  const [searchText, setSearchText] = useState(searchParams.get("q") || "")
  const [sportFilter, setSportFilter] = useState(
    searchParams.get("sport") || "all"
  )
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "default")
  const [priceMin, setPriceMin] = useState(searchParams.get("price_min") || "")
  const [priceMax, setPriceMax] = useState(searchParams.get("price_max") || "")

  // User geolocation for nearby courts
  const geo = useGeolocation()
  const [maxDistance, setMaxDistance] = useState("")
  const userLocation =
    geo.latitude && geo.longitude
      ? { latitude: geo.latitude, longitude: geo.longitude }
      : null

  // Sync URL -> state on mount
  useEffect(() => {
    if (!initialized.current) {
      setSearchText(searchParams.get("q") || "")
      setSportFilter(searchParams.get("sport") || "all")
      setSortBy(searchParams.get("sort") || "default")
      setPriceMin(searchParams.get("price_min") || "")
      setPriceMax(searchParams.get("price_max") || "")
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
    if (sportFilter && sportFilter !== "all")
      params.set("sport_type", sportFilter)
    if (priceMin) params.set("price_min", priceMin)
    if (priceMax) params.set("price_max", priceMax)
    if (sortBy === "price_asc") params.set("sort", "price_asc")
    if (sortBy === "price_desc") params.set("sort", "price_desc")
    if (sortBy === "rating") params.set("sort", "rating")
    if (sortBy === "distance") params.set("sort", "distance")
    // Nearby courts: pass user location if granted
    if (userLocation && maxDistance) {
      params.set("ref_lat", String(userLocation.latitude))
      params.set("ref_lon", String(userLocation.longitude))
      params.set("max_distance_km", maxDistance)
    } else if (userLocation) {
      params.set("ref_lat", String(userLocation.latitude))
      params.set("ref_lon", String(userLocation.longitude))
      params.set("max_distance_km", "20") // default 20km
    }
    return params.toString()
  }, [page, limit, searchText, sportFilter, priceMin, priceMax, sortBy, userLocation, maxDistance])

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchText) params.set("q", searchText)
    if (sportFilter && sportFilter !== "all") params.set("sport", sportFilter)
    if (sortBy !== "default") params.set("sort", sortBy)
    if (priceMin) params.set("price_min", priceMin)
    if (priceMax) params.set("price_max", priceMax)
    const qs = params.toString()
    const url = qs ? `/?${qs}` : "/"
    router.replace(url, { scroll: false })
  }, [searchText, sportFilter, sortBy, priceMin, priceMax, router])

  const fetchCourts = useCallback(async () => {
    setCourtsLoading(true)
    try {
      const res = await api<{ courts: Court[]; total: number }>(
        `/api/v1/courts?${apiParams}`
      )
      setFeaturedCourts(res.courts)
      setTotal(res.total)
    } catch {
      // API may not be available
    } finally {
      setCourtsLoading(false)
    }
  }, [apiParams])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      fetchCourts()
    }
  }, [authLoading, isAuthenticated, fetchCourts])

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard")
    }
  }, [authLoading, isAuthenticated, router])

  function clearFilters() {
    setSearchText("")
    setSportFilter("all")
    setSortBy("default")
    setPriceMin("")
    setPriceMax("")
    setPage(0)
  }

  const hasActiveFilters =
    searchText ||
    (sportFilter && sportFilter !== "all") ||
    sortBy !== "default" ||
    priceMin ||
    priceMax

  if (authLoading) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
        <SiteFooter />
      </div>
    )
  }

  if (isAuthenticated)
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">در حال انتقال به داشبورد...</p>
        </div>
        <SiteFooter />
      </div>
    )

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex min-h-svh flex-col">
      {/* Site Header */}
      <SiteHeader />

      <main>
        {/* Hero Section */}
        <HeroSection />

        {/* About Section */}
        <AboutSection />

        {/* How It Works */}
        <HowItWorks />

        {/* Roles Section */}
        <RolesSection />

        {/* Search & Filters */}
        <section className="relative overflow-hidden px-4 py-16 md:py-20" id="courts">
          <div className="neon-orb neon-orb-3" />
          <div className="neon-orb neon-orb-purple !right-auto left-1/3 top-1/4" />
          <div className="bg-mesh pointer-events-none absolute inset-0" />
          <div className="bg-dots pointer-events-none absolute inset-0" />
          <div className="relative z-10 mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold md:text-4xl">
                جستجوی <span className="text-gradient-primary">سالن‌ها</span>
              </h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
                زمین ورزشی مورد نظر خود را پیدا کنید
              </p>
            </div>
            <div className="glass-card rounded-2xl p-5 md:p-6 flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <Label
                  htmlFor="search"
                  className="mb-1.5 block text-xs text-muted-foreground"
                >
                  جستجو
                </Label>
                <div className="relative">
                  <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="نام زمین، آدرس..."
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value)
                      setPage(0)
                    }}
                    className="pr-9"
                  />
                </div>
              </div>
              <div className="w-[140px]">
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  ورزش
                </Label>
                <Select
                  value={sportFilter}
                  onValueChange={(v) => {
                    setSportFilter(v)
                    setPage(0)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    <SelectItem value="volleyball">والیبال</SelectItem>
                    <SelectItem value="basketball">بسکتبال</SelectItem>
                    <SelectItem value="futsal">فوتسال</SelectItem>
                    <SelectItem value="handball">هندبال</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[140px]">
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  مرتب‌سازی
                </Label>
                <Select
                  value={sortBy}
                  onValueChange={(v) => {
                    setSortBy(v)
                    setPage(0)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">پیش‌فرض</SelectItem>
                    <SelectItem value="price_asc">قیمت: کم به زیاد</SelectItem>
                    <SelectItem value="price_desc">قیمت: زیاد به کم</SelectItem>
                    <SelectItem value="rating">امتیاز</SelectItem>
                    <SelectItem value="distance">نزدیک‌ترین به من</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <SlidersHorizontal className="size-4" />
                    فیلترهای بیشتر
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px]">
                  <SheetHeader>
                    <SheetTitle>فیلترها</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <div className="space-y-2">
                      <Label>محدوده قیمت (تومان)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="حداقل"
                          value={priceMin}
                          onChange={(e) => {
                            setPriceMin(e.target.value)
                            setPage(0)
                          }}
                        />
                        <span className="text-muted-foreground">—</span>
                        <Input
                          type="number"
                          placeholder="حداکثر"
                          value={priceMax}
                          onChange={(e) => {
                            setPriceMax(e.target.value)
                            setPage(0)
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={clearFilters}
                    >
                      <X className="ml-2 size-4" />
                      پاک کردن فیلترها
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </section>

        {/* Map */}
        <section className="relative overflow-hidden px-4 py-16 md:py-20">
          <div className="neon-orb neon-orb-pink" />
          <div className="neon-orb neon-orb-cyan top-[20%] !right-auto !left-[60%]" />
          <div className="neon-orb neon-orb-orange !bottom-[-80px] !right-[-60px]" />
          <div className="bg-mesh pointer-events-none absolute inset-0" />
          <div className="bg-dots pointer-events-none absolute inset-0" />
          <ScrollReveal className="relative z-10 mx-auto max-w-5xl">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold md:text-4xl">
                موقعیت <span className="text-gradient-primary">سالن‌ها</span>
              </h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
                نزدیک‌ترین زمین‌های ورزشی به خود را پیدا کنید
              </p>
            </div>
            {/* Location status */}
            {geo.loading && (
              <div className="mb-3 flex items-center gap-2 rounded-xl glass-card px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                <div className="size-2 animate-pulse rounded-full bg-blue-500" />
                در حال دریافت موقعیت شما...
              </div>
            )}
            {geo.error && (
              <div className="mb-3 flex items-center justify-between rounded-xl glass-card px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0" />
                  <span>موقعیت‌یابی غیرفعال است — زمین‌های نزدیک نمایش داده نمی‌شوند</span>
                </div>
                {geo.permissionState === "denied" && (
                  <span className="text-xs text-muted-foreground">فعال‌سازی در تنظیمات مرورگر</span>
                )}
              </div>
            )}
            {userLocation && (
              <div className="mb-3 flex items-center gap-2 rounded-xl glass-card px-4 py-3 text-sm text-green-700 dark:text-green-300">
                <MapPin className="size-4 shrink-0" />
                <span>نمایش زمین‌های نزدیک به موقعیت شما</span>
              </div>
            )}
            <div className="glass-card rounded-2xl overflow-hidden">
              <CourtsMap courts={featuredCourts} height="400px" userLocation={userLocation} />
            </div>
          </ScrollReveal>
        </section>

        {/* Courts Grid */}
        <section className="relative overflow-hidden px-4 py-16 md:py-20">
          <div className="neon-orb neon-orb-3 !top-auto !bottom-[-120px] !left-[-100px]" />
          <div className="neon-orb neon-orb-green !bottom-[-80px] !right-[-80px]" />
          <div className="neon-orb neon-orb-cyan !top-[-150px] !right-[-120px]" />
          <div className="bg-mesh pointer-events-none absolute inset-0" />
          <div className="bg-dots pointer-events-none absolute inset-0" />
          <ScrollReveal className="relative z-10 mx-auto max-w-5xl">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold md:text-4xl">
                  <span className="text-gradient-primary">سالن‌های</span> موجود
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {toPersianDigits(total)} زمین پیدا شد
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mr-2 text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      پاک کردن فیلتر
                    </button>
                  )}
                </p>
              </div>
            </div>

            {courtsLoading ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl p-5">
                    <Skeleton className="mb-3 h-5 w-32" />
                    <Skeleton className="mb-2 h-4 w-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : featuredCourts.length === 0 ? (
              <div className="glass-card rounded-2xl flex flex-col items-center gap-4 py-20 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                  <Building2 className="size-8 text-muted-foreground" />
                </div>
                <p className="text-lg text-muted-foreground">
                  هیچ زمینی با فیلترهای انتخاب شده یافت نشد
                </p>
                <Button variant="outline" onClick={clearFilters} className="neon-border-hover">
                  پاک کردن فیلترها
                </Button>
              </div>
            ) : (
              <>
                <div className="stagger-fade-in grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {featuredCourts.map((court) => (
                    <Link
                      key={court.id}
                      href={`/courts/${court.id}`}
                      className="group block glass-card neon-border-hover tilt-card rounded-2xl p-5 transition-all hover:-translate-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate font-semibold transition-colors group-hover:text-primary">
                              {court.name}
                            </h3>
                            <FavoriteButton courtId={court.id} />
                          </div>
                          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{court.address}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {court.sport_types?.map((st) => (
                            <Badge
                              key={st}
                              className={`shrink-0 ${sportColors[st]}`}
                              variant="secondary"
                            >
                              {sportLabels[st]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          ظرفیت: {toPersianDigits(court.capacity)} نفر
                        </span>
                        <div className="flex items-center gap-1">
                          <Star className="size-4 fill-yellow-400 text-yellow-400" />
                          <span>{court.average_rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="mt-3 text-sm font-medium text-gradient-primary">
                        {formatPrice(court.base_price)}
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronRight className="ml-1 size-4" />
                      قبلی
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 5) }).map(
                      (_, i) => {
                        const pageNum =
                          Math.max(0, Math.min(page - 2, totalPages - 5)) + i
                        if (pageNum >= totalPages) return null
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                          >
                            {toPersianDigits(pageNum + 1)}
                          </Button>
                        )
                      }
                    )}
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
                )}
              </>
            )}
          </ScrollReveal>
        </section>
      </main>

      {/* Site Footer */}
      <SiteFooter />
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  )
}

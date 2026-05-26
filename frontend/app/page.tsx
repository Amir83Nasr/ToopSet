"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"

const CourtsMap = dynamic(() => import("@/components/map/courts-map").then((m) => m.CourtsMap), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center rounded-xl border bg-muted" style={{ height: "400px" }}>
      <p className="text-sm text-muted-foreground">در حال بارگذاری نقشه...</p>
    </div>
  ),
})
import {
  Volleyball,
  Building2,
  CalendarDays,
  CreditCard,
  Star,
  MapPin,
  Users,
} from "lucide-react"

interface FeaturedCourt {
  id: number
  name: string
  sport_type: string
  address: string
  latitude: number
  longitude: number
  capacity: number
  is_active: boolean
  average_rating: number
}

const sportLabels: Record<string, string> = {
  volleyball: "والیبال",
  basketball: "بسکتبال",
  futsal: "فوتسال",
  handball: "هندبال",
}

const sportColors: Record<string, string> = {
  volleyball: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  basketball: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  futsal: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  handball: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
}

export default function HomePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [featuredCourts, setFeaturedCourts] = useState<FeaturedCourt[]>([])
  const [courtsLoading, setCourtsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard")
    }
  }, [authLoading, isAuthenticated, router])

  const fetchFeaturedCourts = useCallback(async () => {
    try {
      const res = await api<{ courts: FeaturedCourt[] }>(
        "/api/v1/courts?limit=6&is_active=true"
      )
      setFeaturedCourts(res.courts)
    } catch {
      // API may not be available
    } finally {
      setCourtsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      fetchFeaturedCourts()
    }
  }, [authLoading, isAuthenticated, fetchFeaturedCourts])

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (isAuthenticated) return null

  return (
    <div className="flex min-h-svh flex-col">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative z-10 flex max-w-2xl flex-col items-center gap-6">
          <div className="flex size-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-2xl">
            <Volleyball className="size-10" />
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              توپ سِت
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              سامانه هوشمند رزرو آنلاین زمین‌های ورزشی
              <br />
              والیبال، بسکتبال، فوتسال و هندبال
            </p>
          </div>
          <div className="flex gap-4">
            <Button asChild size="lg" className="h-12 px-8">
              <Link href="/login">ورود</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8">
              <Link href="/register">ثبت‌نام</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-2xl font-bold">چگونه کار می‌کند؟</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary">
                <Building2 className="size-8 text-primary-foreground" />
              </div>
              <h3 className="mb-2 font-semibold">زمین انتخاب کنید</h3>
              <p className="text-sm text-muted-foreground">
                از میان زمین‌های ورزشی در نقشه، زمین مورد علاقه خود را انتخاب کنید
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary">
                <CalendarDays className="size-8 text-primary-foreground" />
              </div>
              <h3 className="mb-2 font-semibold">زمان انتخاب کنید</h3>
              <p className="text-sm text-muted-foreground">
                از بین زمان‌های آزاد، زمان دلخواه خود را رزرو کنید
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary">
                <CreditCard className="size-8 text-primary-foreground" />
              </div>
              <h3 className="mb-2 font-semibold">پرداخت کنید</h3>
              <p className="text-sm text-muted-foreground">
                با استفاده از کیف پول دیجیتال، هزینه را به راحتی پرداخت کنید
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courts Map */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">زمین‌های ما را روی نقشه ببینید</h2>
            <p className="text-muted-foreground">
              تمام زمین‌های ورزشی در دسترس شما
            </p>
          </div>
          <CourtsMap courts={featuredCourts} height="400px" />
        </div>
      </section>

      {/* Featured Courts List */}
      {featuredCourts.length > 0 && (
        <section className="bg-muted/30 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-2xl font-bold">زمین‌های ویژه</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {featuredCourts.map((court) => (
                <Link
                  key={court.id}
                  href={`/courts/${court.id}`}
                  className="block rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{court.name}</h3>
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        <span className="truncate">{court.address}</span>
                      </div>
                    </div>
                    <Badge className={sportColors[court.sport_type]} variant="secondary">
                      {sportLabels[court.sport_type]}
                    </Badge>
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
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-4 text-2xl font-bold">آماده شروع هستید؟</h2>
          <p className="mb-6 text-muted-foreground">
            همین حالا ثبت‌نام کنید و اولین رزرو ورزشی خود را انجام دهید
          </p>
          <Button asChild size="lg" className="h-12 px-8">
            <Link href="/register">ثبت‌نام رایگان</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
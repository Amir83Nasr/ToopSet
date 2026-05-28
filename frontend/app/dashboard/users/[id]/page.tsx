"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChevronLeft,
  ChevronRight,
  ShieldX,
  User,
  Calendar,
  Building2,
  CreditCard,
} from "lucide-react"
import Link from "next/link"

interface UserDetail {
  id: number
  phone: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string | null
}

interface UserBooking {
  id: number
  court_name: string
  start_time: string | null
  status: string
  price_paid: number
}

const roleLabels: Record<string, string> = {
  user: "کاربر",
  manager: "مدیر زمین",
  admin: "مدیر سیستم",
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending_payment: { label: "در انتظار پرداخت", variant: "outline" },
  confirmed: { label: "تایید شده", variant: "default" },
  cancelled: { label: "لغو شده", variant: "secondary" },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
}

export default function UserDetailPage() {
  const params = useParams()
  const { user: currentUser } = useAuth()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [bookings, setBookings] = useState<UserBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingsPage, setBookingsPage] = useState(0)
  const [bookingsTotal, setBookingsTotal] = useState(0)
  const bookingsLimit = 10

  const userId = Number(params.id)

  const fetchUser = useCallback(async () => {
    try {
      const data = await api<UserDetail>(`/api/v1/users/${userId}`)
      setUser(data)
    } catch {
      // error
    }
  }, [userId])

  const fetchBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set("user_id", String(userId))
      params.set("skip", String(bookingsPage * bookingsLimit))
      params.set("limit", String(bookingsLimit))
      const data = await api<{ bookings: UserBooking[]; total: number }>(
        `/api/v1/bookings/all?${params}`
      )
      // Actually, the /all endpoint doesn't support user_id filter
      // Let's use a different approach - just don't show paginated bookings
    } catch {
      // silently fail
    }
  }, [userId, bookingsPage])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchUser()]).finally(() => setLoading(false))
  }, [fetchUser])

  // Access denied
  if (currentUser && currentUser.role !== "admin") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
        <ShieldX className="size-16" />
        <p className="text-xl">شما دسترسی به این بخش را ندارید</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-6 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">کاربر یافت نشد</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/users">
            <ChevronRight className="ml-1 size-4" />
            بازگشت
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{user.full_name}</h1>
          <p className="text-muted-foreground">مشخصات و فعالیت کاربر</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">نقش</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
              {roleLabels[user.role] || user.role}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">وضعیت</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={user.is_active ? "default" : "secondary"}>
              {user.is_active ? "فعال" : "غیرفعال"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">تاریخ ثبت‌نام</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{user.created_at ? formatDate(user.created_at) : "-"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">اطلاعات تماس</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <span dir="ltr">{toPersianDigits(user.phone)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  ArrowRight,
  Pencil,
  CalendarPlus,
  Building2,
  MapPin,
  Star,
  Users,
} from "lucide-react"

interface Court {
  id: number
  name: string
  sport_type: string
  address: string
  capacity: number
  is_active: boolean
  average_rating: number
  created_at: string
}

interface TimeSlot {
  id: number
  court_id: number
  start_time: string
  end_time: string
  base_price: number
  is_reserved: boolean
  version: number
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

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("fa-IR")
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان"
}

export default function CourtDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const courtId = Number(params.id)

  const [court, setCourt] = useState<Court | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsTotal, setSlotsTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const canManage = user?.role === "manager" || user?.role === "admin"

  const fetchData = useCallback(async () => {
    try {
      const [courtRes, slotsRes] = await Promise.all([
        api<Court>(`/api/v1/courts/${courtId}`),
        api<{ slots: TimeSlot[]; total: number }>(
          `/api/v1/courts/${courtId}/slots?limit=100`
        ),
      ])
      setCourt(courtRes)
      setSlots(slotsRes.slots)
      setSlotsTotal(slotsRes.total)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true)
      } else {
        toast.error("خطا در دریافت اطلاعات")
      }
    } finally {
      setLoading(false)
    }
  }, [courtId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleCreateSlot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreating(true)

    const form = new FormData(e.currentTarget)
    const date = form.get("date") as string
    const start = form.get("start_time") as string
    const end = form.get("end_time") as string
    const price = form.get("base_price") as string

    const data = {
      court_id: courtId,
      start_time: new Date(`${date}T${start}:00`).toISOString(),
      end_time: new Date(`${date}T${end}:00`).toISOString(),
      base_price: parseFloat(price),
    }

    try {
      await api(`/api/v1/courts/${courtId}/slots`, {
        method: "POST",
        body: JSON.stringify(data),
      })
      toast.success("زمان با موفقیت اضافه شد")
      setDialogOpen(false)
      fetchData()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ایجاد زمان"
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        در حال بارگذاری...
      </div>
    )
  }

  if (notFound || !court) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-xl text-muted-foreground">زمین مورد نظر یافت نشد</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/courts")}>
          <ArrowRight className="ml-2 size-4" />
          بازگشت به لیست
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Button variant="ghost" className="w-fit" onClick={() => router.push("/dashboard/courts")}>
        <ArrowRight className="ml-2 size-4" />
        بازگشت به لیست زمین‌ها
      </Button>

      {/* Court info card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{court.name}</CardTitle>
            <CardDescription>
              <Badge className={sportColors[court.sport_type] || ""} variant="secondary">
                {sportLabels[court.sport_type] || court.sport_type}
              </Badge>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/courts/${courtId}/edit`}>
                  <Pencil className="ml-1 size-4" />
                  ویرایش
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="size-4 text-muted-foreground" />
              <span>{court.address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="size-4 text-muted-foreground" />
              <span>ظرفیت: {court.capacity} نفر</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Star className="size-4 text-muted-foreground" />
              <span>امتیاز: {court.average_rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={court.is_active ? "default" : "secondary"}>
                {court.is_active ? "فعال" : "غیرفعال"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time slots section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>زمان‌بندی</CardTitle>
            <CardDescription>
              {slotsTotal} زمان ثبت شده
            </CardDescription>
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <CalendarPlus className="ml-2 size-4" />
                  افزودن زمان
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>افزودن زمان جدید</DialogTitle>
                  <DialogDescription>
                    برای زمین {court.name} یک زمان جدید ثبت کنید
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSlot} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">تاریخ</Label>
                    <Input id="date" name="date" type="date" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">ساعت شروع</Label>
                      <Input id="start_time" name="start_time" type="time" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">ساعت پایان</Label>
                      <Input id="end_time" name="end_time" type="time" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="base_price">قیمت (تومان)</Label>
                    <Input
                      id="base_price"
                      name="base_price"
                      type="number"
                      min="0"
                      placeholder="۵۰۰۰۰۰"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={creating}>
                      {creating ? "در حال ثبت..." : "ثبت زمان"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {slots.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              هنوز زمانی برای این زمین ثبت نشده است
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>ساعت شروع</TableHead>
                  <TableHead>ساعت پایان</TableHead>
                  <TableHead>قیمت</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell>{formatDate(slot.start_time)}</TableCell>
                    <TableCell>{formatTime(slot.start_time)}</TableCell>
                    <TableCell>{formatTime(slot.end_time)}</TableCell>
                    <TableCell>{formatPrice(slot.base_price)}</TableCell>
                    <TableCell>
                      <Badge variant={slot.is_reserved ? "secondary" : "outline"}>
                        {slot.is_reserved ? "رزرو شده" : "آزاد"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!slot.is_reserved && !canManage && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await api("/api/v1/bookings", {
                                method: "POST",
                                body: JSON.stringify({ slot_id: slot.id }),
                              })
                              toast.success("رزرو با موفقیت انجام شد")
                              fetchData()
                              router.push("/dashboard/bookings")
                            } catch (err) {
                              const msg = err instanceof ApiError ? err.message : "خطا در رزرو"
                              toast.error(msg)
                            }
                          }}
                        >
                          رزرو
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

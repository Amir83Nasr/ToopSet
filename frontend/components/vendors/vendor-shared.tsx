import { Star } from "lucide-react"

export interface VendorData {
  id: number
  name: string
  sport_types: string[]
  address: string
  latitude: number
  longitude: number
  capacity: number
  is_active: boolean
  average_rating: number
  amenities?: Record<string, boolean>
  images?: string[]
  manager_name?: string
  manager_phone?: string
}

export interface TimeSlot {
  id: number
  vendor_id: number
  start_time: string
  end_time: string
  base_price: number
  ball_price: number
  ball_available: boolean
  status?: string
  is_reserved: boolean
  version: number
}

export function isSlotBookable(slot: Pick<TimeSlot, "is_reserved" | "status">) {
  return !slot.is_reserved || slot.status === "pending_cancellation"
}

export interface Review {
  id: number
  user_name?: string
  rating: number
  comment?: string
  response?: string
  created_at: string
}

export const sportLabels: Record<string, string> = {
  volleyball: "والیبال",
  basketball: "بسکتبال",
  futsal: "فوتسال",
  handball: "هندبال",
  football: "فوتبال",
  tennis: "تنیس",
  badminton: "بدمینتون",
}

export const sportColors: Record<string, string> = {
  volleyball:
    "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground",
  basketball:
    "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground",
  futsal:
    "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground",
  handball:
    "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground",
  football:
    "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground",
  tennis:
    "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground",
  badminton:
    "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground",
}

export const amenityLabels: Record<string, string> = {
  toilet: "سرویس بهداشتی",
  water_cooler: "آبسردکن",
  standard_flooring: "کفپوش استاندارد",
  spectator_seating: "جایگاه تماشاگر",
  air_conditioning: "تهویه مطبوع",
  parking: "پارکینگ",
  locker_room: "رختکن",
  wifi: "اینترنت وای‌فای",
  shower: "حمام",
  canteen: "بوفه",
  snack_bar: "بوفه",
  lighting: "نورافکن",
  cctv: "دوربین مداربسته",
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان"
}

export function formatPersianDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

export function Stars({
  rating,
  size = 16,
}: {
  rating: number
  size?: number
}) {
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/20"
          }
        />
      ))}
    </div>
  )
}

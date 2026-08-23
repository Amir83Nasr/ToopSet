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
  ball_available: boolean
  ball_price: number
  amenities?: Record<string, boolean>
  images?: string[]
  main_image?: string | null
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
  // Set only when this reserving slot is held by the current user's
  // pending_payment booking — makes the row clickable for "continue payment".
  reserved_by_me?: boolean
  my_booking_id?: number | null
}

export const RESERVING_HINT =
  "این سانس هم‌اکنون توسط فرد دیگری در حال رزرو است؛ اگر او تا ۱۰ دقیقه دیگر رزرو را نهایی نکند، می‌توانید این سانس را رزرو کنید."

export const MY_RESERVING_HINT =
  "این سانس رزرو نهایی‌نشدهٔ خودتان است؛ برای ادامه پرداخت کلیک کنید."

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

export function formatPrice(price: number | null | undefined): string {
  if (price == null) return "—"
  const formattedNumber = new Intl.NumberFormat("fa-IR", {
    useGrouping: true,
  })
    .format(price)
    .replace(/,/g, "٬")
  return `${formattedNumber} تومانءء`
}

export function formatPersianDate(iso: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  const formatted = d.toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatted.replace(/[\/\-\.]/g, "٫")
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

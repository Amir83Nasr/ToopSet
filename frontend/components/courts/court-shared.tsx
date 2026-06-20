import {
  Star,
  Bath,
  GlassWater,
  LayoutGrid,
  ArmchairIcon,
  Fan,
  Car,
  DoorOpen,
  Volleyball,
  Swords,
  Footprints,
  Hand,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"

export interface CourtData {
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
  court_id: number
  start_time: string
  end_time: string
  base_price: number
  is_reserved: boolean
  version: number
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

export const sportIcons: Record<string, LucideIcon> = {
  volleyball: Volleyball,
  basketball: Swords,
  futsal: Footprints,
  handball: Hand,
  football: Footprints,
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
  lighting: "نورافکن",
}

export const amenityIcons: Record<string, LucideIcon> = {
  toilet: Bath,
  water_cooler: GlassWater,
  standard_flooring: LayoutGrid,
  spectator_seating: ArmchairIcon,
  air_conditioning: Fan,
  parking: Car,
  locker_room: DoorOpen,
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

export function formatDate(dateStr: string): {
  dayName: string
  dayNum: string
  month: string
  full: string
} {
  const d = new Date(dateStr + "T12:00:00")
  return {
    dayName: d.toLocaleDateString("fa-IR", { weekday: "short" }),
    dayNum: d.toLocaleDateString("fa-IR", { day: "numeric" }),
    month: d.toLocaleDateString("fa-IR", { month: "short" }),
    full: d.toLocaleDateString("fa-IR"),
  }
}

export function formatPersianDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
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

export function SectionHeading({
  icon,
  title,
  action,
}: {
  icon?: ReactNode
  title: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      {icon && <span className="text-primary">{icon}</span>}
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mr-auto h-px flex-1 bg-linear-to-l from-border/60 to-transparent" />
      {action}
    </div>
  )
}

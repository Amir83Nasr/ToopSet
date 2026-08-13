import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const persianDigits: Record<string, string> = {
  "0": "۰",
  "1": "۱",
  "2": "۲",
  "3": "۳",
  "4": "۴",
  "5": "۵",
  "6": "۶",
  "7": "۷",
  "8": "۸",
  "9": "۹",
}

/** Convert English/Latin digits to Persian (Arabic-Indic) digits.
 *  e.g. "09120000000" → "۰۹۱۲۰۰۰۰۰۰۰"
 *  Passes through non-digit characters unchanged.
 */
const englishDigits: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => persianDigits[d])
}

/** Format price with Persian thousands separator (٬) and dedicated toman glyph (تومانءء). */
export function formatPrice(price: number | null | undefined): string {
  if (price == null) return "—"
  const formattedNumber = new Intl.NumberFormat("fa-IR", {
    useGrouping: true,
  }).format(price).replace(/٬/g, "٬").replace(/,/g, "٬")
  return `${toPersianDigits(formattedNumber)} تومانءء`
}

/** Format date in Persian using standard dot separator (٫). */
export function formatPersianDate(dateInput: string | Date): string {
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return "—"
  const formatted = d.toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  // Replace slashes or other separators with Persian dot (٫)
  return toPersianDigits(formatted).replace(/[\/\-\.]/g, "٫")
}

/** Convert Persian/Arabic digits to English (Latin) digits.
 *  e.g. "۰۹۱۲۰۰۰۰۰۰۰" → "09120000000"
 *  Passes through non-digit characters unchanged.
 */
export function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => englishDigits[d])
}

export function getInitials(fullName: string): string {
  if (!fullName) return "?"
  return fullName
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/** Convert a Date to YYYY-MM-DD using local timezone (avoids 1-day shift from .toISOString()). */
export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Get today's date as YYYY-MM-DD in local timezone. */
export function todayStr(): string {
  return toLocalDateStr(new Date())
}

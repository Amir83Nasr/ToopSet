export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]

export const JALALI_WEEKDAYS = [
  "شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه",
]

export interface JalaliDate {
  year: number
  month: number
  day: number
}

/** Reference: 1 Farvardin 1403 = 20 March 2024 */
const REF_JY = 1403
const REF_JM = 1
const REF_JD = 1
const REF_GREGORIAN = new Date(2024, 2, 20)

const JALALI_FORMATTER = new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "Asia/Tehran",
})

/** Get Jalali date parts from a JavaScript Date. */
export function toJalali(date: Date): JalaliDate {
  if (isNaN(date.getTime())) date = new Date()
  const parts = JALALI_FORMATTER.formatToParts(date)
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0", 10)
  return { year: get("year"), month: get("month"), day: get("day") }
}

/** Convert Jalali date to JavaScript Date using Intl API. */
export function fromJalali(jy: number, jm: number, jd: number): Date {
  if (!isFinite(jy) || !isFinite(jm) || !isFinite(jd)) return new Date()
  const estDaysFromRef =
    (jy - REF_JY) * 365.25 + (jm - REF_JM) * 30.4375 + (jd - REF_JD)
  const estimate = new Date(
    REF_GREGORIAN.getTime() + Math.round(estDaysFromRef) * 86400000
  )

  const j = toJalali(estimate)
  const targetOrd = jy * 512 + jm * 32 + jd
  const estOrd = j.year * 512 + j.month * 32 + j.day
  estimate.setDate(estimate.getDate() + (targetOrd - estOrd))

  for (let d = -2; d <= 2; d++) {
    const candidate = new Date(estimate)
    candidate.setDate(estimate.getDate() + d)
    const jc = toJalali(candidate)
    if (jc.year === jy && jc.month === jm && jc.day === jd) return candidate
  }

  return estimate
}

/** Get days in a Jalali month by comparing consecutive month starts. */
export function jalaliDaysInMonth(jy: number, jm: number): number {
  const first = fromJalali(jy, jm, 1)
  let ny = jy, nm = jm + 1
  if (nm > 12) { nm = 1; ny++ }
  const firstOfNext = fromJalali(ny, nm, 1)
  return Math.round((firstOfNext.getTime() - first.getTime()) / 86400000)
}

export function startOfJalaliMonth(jy: number, jm: number): Date {
  return fromJalali(jy, jm, 1)
}

/** Format a JavaScript Date as a Persian Jalali string. */
export function formatJalali(
  date: Date | undefined | null,
  type: "short" | "long" = "short"
): string {
  if (!date) return ""
  const j = toJalali(date)
  if (type === "long") {
    return `${j.day} ${JALALI_MONTHS[j.month - 1]} ${j.year}`
  }
  return `${j.year}/${String(j.month).padStart(2, "0")}/${String(j.day).padStart(2, "0")}`
}

/** Build a 6-week grid of day numbers for a Jalali month. */
export function buildJalaliGrid(
  jy: number,
  jm: number
): (number | null)[][] {
  const firstDay = startOfJalaliMonth(jy, jm)
  const startWeekday = (firstDay.getDay() + 1) % 7
  const daysInMonth = jalaliDaysInMonth(jy, jm)

  const grid: (number | null)[][] = []
  let day = 1
  for (let w = 0; w < 6 && day <= daysInMonth; w++) {
    const week: (number | null)[] = []
    for (let d = 0; d < 7; d++) {
      if ((w === 0 && d < startWeekday) || day > daysInMonth) {
        week.push(null)
      } else {
        week.push(day++)
      }
    }
    grid.push(week)
  }
  return grid
}

export function isToday(jy: number, jm: number, jd: number): boolean {
  const now = toJalali(new Date())
  return now.year === jy && now.month === jm && now.day === jd
}

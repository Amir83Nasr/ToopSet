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

function isJalaliLeapYear(jy: number): boolean {
  const matches = [
    1, 5, 9, 13, 17, 22, 26, 30, 35, 39, 43, 48, 52, 56, 61, 65, 69, 74, 78, 82,
    87, 91, 95, 100, 104, 108, 113, 117, 121, 126, 130, 134, 139, 143, 147, 152,
    156, 160, 165, 169, 173, 178, 182, 186, 191, 195, 199, 204, 208, 212, 217,
    221, 225, 230, 234, 238, 243, 247, 251, 256, 260, 264, 269, 273, 277, 282,
    286, 290, 295, 299, 303, 308, 312, 316, 321, 325, 329, 334, 338, 342, 347,
    351, 355, 360, 364,
  ]
  return matches.includes(((jy - 1) % 128) + 1)
}

export function jalaliDaysInMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  return isJalaliLeapYear(jy) ? 30 : 29
}

function jalaliToDays(jy: number, jm: number, jd: number): number {
  let days = 0
  for (let y = 1; y < jy; y++) days += isJalaliLeapYear(y) ? 366 : 365
  for (let m = 1; m < jm; m++) days += jalaliDaysInMonth(jy, m)
  days += jd - 1
  return days
}

/** Get Jalali date parts from a JavaScript Date. */
export function toJalali(date: Date): JalaliDate {
  const formatter = new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tehran",
  })
  const parts = formatter.formatToParts(date)
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0", 10)
  return { year: get("year"), month: get("month"), day: get("day") }
}

/** Convert Jalali date to JavaScript Date. */
export function fromJalali(jy: number, jm: number, jd: number): Date {
  // Reference: 1 Farvardin 1403 = 20 March 2024
  const REF_JY = 1403, REF_JM = 1, REF_JD = 1
  const REF_DATE = new Date(2024, 2, 20)

  const refDays = jalaliToDays(REF_JY, REF_JM, REF_JD)
  const targetDays = jalaliToDays(jy, jm, jd)
  const diffDays = targetDays - refDays

  const estimate = new Date(REF_DATE.getTime() + diffDays * 86400000)

  let lo = -10, hi = 10
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    const candidate = new Date(estimate)
    candidate.setDate(estimate.getDate() + mid)
    const j = toJalali(candidate)

    if (j.year === jy && j.month === jm && j.day === jd) return candidate

    const cmp = j.year * 400 + j.month * 32 + j.day
    const tgt = jy * 400 + jm * 32 + jd
    if (cmp < tgt) lo = mid + 1
    else hi = mid - 1
  }

  return estimate
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

/** Build a 6-week grid of day numbers for a Jalali month. null = outside the month. */
export function buildJalaliGrid(
  jy: number,
  jm: number
): (number | null)[][] {
  const firstDay = startOfJalaliMonth(jy, jm)
  const startWeekday = (firstDay.getDay() + 1) % 7 // Saturday=0
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

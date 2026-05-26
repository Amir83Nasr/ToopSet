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
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => persianDigits[d])
}

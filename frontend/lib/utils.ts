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

/** Convert Persian/Arabic digits to English (Latin) digits.
 *  e.g. "۰۹۱۲۰۰۰۰۰۰۰" → "09120000000"
 *  Passes through non-digit characters unchanged.
 */
export function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => englishDigits[d])
}

import { QOM_SUGGESTIONS } from "@amir83nasr/map"
import type { SearchSuggestion } from "@amir83nasr/map"

// ── NORMALIZE / QOM ──────────────────────────────────────

/** Drop the redundant city suffix - every suggestion is in Qom. */
function stripQom(name: string): string {
  return name.replace(/،\s*قم\s*$/, "").trim()
}

/** Flip detail suffix so the city leads: "شهر قم، detail". */
function qomFirst(addr: string): string {
  const t = addr.trim()
  if (t.startsWith("شهر قم")) return t
  const m = t.match(/^(.*)،\s*شهر قم\s*$/)
  if (m) return "شهر قم، " + m[1].trim()
  const q = t.match(/^(.*)،\s*قم\s*$/)
  if (q) return "شهر قم، " + q[1].trim()
  return "شهر قم، " + t
}

function normalized(s: SearchSuggestion): SearchSuggestion {
  return { ...s, name: stripQom(s.name), addr: qomFirst(s.addr) }
}

// ── EXTRA / QOM / SUGGESTIONS ────────────────────────────

/** Landmarks, streets and districts missing from the package defaults. */
export const EXTRA_QOM_SUGGESTIONS: SearchSuggestion[] = [
  {
    name: "حرم حضرت معصومه (س)",
    addr: "شهر قم، خیابان ارم",
    lat: 34.6419,
    lng: 50.8796,
  },
  {
    name: "مسجد مقدس جمکران",
    addr: "شهر قم، بلوار جمکران",
    lat: 34.5866,
    lng: 50.9085,
  },
  {
    name: "بازار قدیم",
    addr: "شهر قم، خیابان طالقانی",
    lat: 34.6435,
    lng: 50.8815,
  },
  {
    name: "ورزشگاه یادگار امام",
    addr: "شهر قم، بلوار شهید بهشتی",
    lat: 34.631,
    lng: 50.8665,
  },
  {
    name: "بوستان علوی",
    addr: "شهر قم، بلوار الغدیر",
    lat: 34.625,
    lng: 50.883,
  },
  {
    name: "بوستان شهید بنیادی",
    addr: "شهر قم، بلوار امین",
    lat: 34.6488,
    lng: 50.8681,
  },
  {
    name: "دانشگاه قم",
    addr: "شهر قم، بلوار جمهوری اسلامی",
    lat: 34.6525,
    lng: 50.882,
  },
  {
    name: "دانشگاه آزاد",
    addr: "شهر قم، بلوار ۱۵ خرداد",
    lat: 34.618,
    lng: 50.865,
  },
  {
    name: "ترمینال مسافربری",
    addr: "شهر قم، بلوار جمهوری اسلامی",
    lat: 34.657,
    lng: 50.872,
  },
  {
    name: "ایستگاه راه‌آهن",
    addr: "شهر قم، خیابان امام خمینی",
    lat: 34.646,
    lng: 50.862,
  },
  {
    name: "بیمارستان شهید بهشتی",
    addr: "شهر قم، خیابان سمیه",
    lat: 34.638,
    lng: 50.892,
  },
  {
    name: "مصلای قدس",
    addr: "شهر قم، خیابان انقلاب",
    lat: 34.645,
    lng: 50.895,
  },
  {
    name: "کوه خضر نبی",
    addr: "شهر قم، جاده کوه خضر",
    lat: 34.615,
    lng: 50.91,
  },
  { name: "قم‌نو", addr: "شهر قم، محله قم‌نو", lat: 34.633, lng: 50.898 },
  {
    name: "شهرک قدس",
    addr: "شهر قم، بلوار امام رضا",
    lat: 34.6205,
    lng: 50.8603,
  },
  {
    name: "شهرک صدرا",
    addr: "شهر قم، فاز ۳، بلوار ورزش",
    lat: 34.6101,
    lng: 50.85,
  },
  { name: "شهرک دانش", addr: "شهر قم، شهرک دانش", lat: 34.605, lng: 50.848 },
  { name: "شهرک ایثار", addr: "شهر قم، شهرک ایثار", lat: 34.608, lng: 50.855 },
  {
    name: "بلوار الغدیر",
    addr: "شهر قم، بلوار الغدیر",
    lat: 34.6189,
    lng: 50.891,
  },
  {
    name: "بلوار جمهوری اسلامی",
    addr: "شهر قم، بلوار جمهوری اسلامی",
    lat: 34.65,
    lng: 50.884,
  },
  {
    name: "بلوار پانزده خرداد",
    addr: "شهر قم، بلوار پانزده خرداد",
    lat: 34.635,
    lng: 50.885,
  },
  {
    name: "بلوار شهید بهشتی",
    addr: "شهر قم، بلوار شهید بهشتی",
    lat: 34.628,
    lng: 50.878,
  },
  {
    name: "بلوار آیت‌الله بروجردی",
    addr: "شهر قم، بلوار بروجردی",
    lat: 34.6455,
    lng: 50.8855,
  },
  {
    name: "خیابان امام خمینی",
    addr: "شهر قم، خیابان امام خمینی",
    lat: 34.6401,
    lng: 50.8698,
  },
  {
    name: "خیابان ارم",
    addr: "شهر قم، خیابان ارم",
    lat: 34.6419,
    lng: 50.8806,
  },
  {
    name: "خیابان ۲۲ بهمن",
    addr: "شهر قم، خیابان ۲۲ بهمن",
    lat: 34.6257,
    lng: 50.8703,
  },
  {
    name: "خیابان بعثت",
    addr: "شهر قم، خیابان بعثت",
    lat: 34.6312,
    lng: 50.8756,
  },
  {
    name: "خیابان طالقانی",
    addr: "شهر قم، خیابان طالقانی",
    lat: 34.639,
    lng: 50.883,
  },
  {
    name: "میدان جانبازان",
    addr: "شهر قم، میدان جانبازان",
    lat: 34.624,
    lng: 50.873,
  },
  {
    name: "میدان سعیدی",
    addr: "شهر قم، میدان سعیدی",
    lat: 34.637,
    lng: 50.866,
  },
  { name: "میدان ارتش", addr: "شهر قم، میدان ارتش", lat: 34.644, lng: 50.87 },
  { name: "جعفرآباد", addr: "شهر قم، محله جعفرآباد", lat: 34.67, lng: 50.9 },
  {
    name: "شاه‌ابراهیم",
    addr: "شهر قم، محله شاه‌ابراهیم",
    lat: 34.655,
    lng: 50.88,
  },
  { name: "قنوات", addr: "شهر قم، قنوات", lat: 34.6, lng: 50.92 },
  {
    name: "شهرک نوبنیاد",
    addr: "شهر قم، شهرک نوبنیاد",
    lat: 34.61,
    lng: 50.88,
  },
  {
    name: "شادقلی‌خان",
    addr: "شهر قم، محله شادقلی‌خان",
    lat: 34.6368,
    lng: 50.8745,
  },
  {
    name: "چهل اختران",
    addr: "شهر قم، خیابان چهل اختران",
    lat: 34.6455,
    lng: 50.8728,
  },
  {
    name: "امامزاده ابراهیم",
    addr: "شهر قم، خیابان امامزاده ابراهیم",
    lat: 34.6442,
    lng: 50.8702,
  },
  {
    name: "امامزاده موسی مبرقع",
    addr: "شهر قم، خیابان چهل اختران",
    lat: 34.6468,
    lng: 50.8735,
  },
  {
    name: "دروازه کاشان",
    addr: "شهر قم، دروازه کاشان",
    lat: 34.6528,
    lng: 50.8735,
  },
  {
    name: "قلعه کامکار",
    addr: "شهر قم، قلعه کامکار",
    lat: 34.6682,
    lng: 50.8922,
  },
  { name: "گذر خان", addr: "شهر قم، بازار قدیم", lat: 34.6435, lng: 50.8828 },
  {
    name: "میدان آستانه",
    addr: "شهر قم، میدان آستانه",
    lat: 34.6438,
    lng: 50.8799,
  },
  {
    name: "مدرسه فیضیه",
    addr: "شهر قم، جنب حرم مطهر",
    lat: 34.6432,
    lng: 50.8803,
  },
  {
    name: "مسجد اعظم",
    addr: "شهر قم، جنب حرم مطهر",
    lat: 34.6425,
    lng: 50.8788,
  },
  {
    name: "گنبد سبز",
    addr: "شهر قم، خیابان انقلاب",
    lat: 34.6482,
    lng: 50.8865,
  },
  {
    name: "شاه جمال",
    addr: "شهر قم، امامزاده شاه جمال",
    lat: 34.6335,
    lng: 50.8892,
  },
  {
    name: "یخچال قاضی",
    addr: "شهر قم، خیابان انقلاب",
    lat: 34.6405,
    lng: 50.8932,
  },
  {
    name: "شهرک فاطمیه",
    addr: "شهر قم، شهرک فاطمیه",
    lat: 34.6285,
    lng: 50.8568,
  },
  {
    name: "۴۵ متری عمار یاسر",
    addr: "شهر قم، خیابان عمار یاسر",
    lat: 34.6322,
    lng: 50.8845,
  },
  {
    name: "خیابان جوادالائمه",
    addr: "شهر قم، خیابان جوادالائمه",
    lat: 34.6378,
    lng: 50.8772,
  },
  { name: "بلوار دانشجو", addr: "شهر قم، پردیسان", lat: 34.5985, lng: 50.8452 },
  {
    name: "بلوار امام موسی صدر",
    addr: "شهر قم، پردیسان",
    lat: 34.5958,
    lng: 50.8385,
  },
]

// ── MERGED / LIST ────────────────────────────────────────

/** Package defaults + extras, normalized and de-duplicated by name. */
export const QOM_SUGGESTIONS_EXTENDED: SearchSuggestion[] = [
  ...QOM_SUGGESTIONS.map(normalized),
  ...EXTRA_QOM_SUGGESTIONS.filter(
    (e) => !QOM_SUGGESTIONS.map((b) => normalized(b).name).includes(e.name)
  ),
]

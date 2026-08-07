import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "جستجوی مجموعه‌های ورزشی",
  description:
    "جستجو، مقایسه و رزرو آنلاین سانس سالن فوتسال، زمین چمن مصنوعی و مجموعه‌های ورزشی قم با توپ‌سِت (ToopSet).",
  alternates: { canonical: "/vendors" },
}

export default function VendorsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>
}

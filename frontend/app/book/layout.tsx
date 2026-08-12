import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "رزرو سانس",
  description:
    "رزرو آنلاین سانس زمین‌های ورزشی، سالن فوتسال و چمن مصنوعی در قم با توپ‌سِت (ToopSet) — بدون تماس تلفنی.",
  alternates: { canonical: "/book" },
  robots: {
    index: false,
    follow: true,
  },
}

export default function BookLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>
}

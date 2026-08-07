import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ارتباط با ما",
  description:
    "برای رزرو آنلاین زمین‌های ورزشی در قم و هرگونه سوال درباره مجموعه‌های ورزشی با تیم توپ‌سِت (ToopSet) در تماس باشید.",
  alternates: { canonical: "/contact" },
}

export default function ContactLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>
}

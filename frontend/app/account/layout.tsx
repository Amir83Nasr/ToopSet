import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "حساب کاربری",
  description: "مدیریت حساب کاربری، رزروها، پرداخت‌ها و تنظیمات",
  robots: {
    index: false,
    follow: true,
  },
}

export default function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>
}

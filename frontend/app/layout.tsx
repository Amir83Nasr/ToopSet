import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "./providers"
import { CursorAmbient } from "@/components/ui/cursor-ambient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "توپ‌سِت | ToopSet",
  description: "سامانه رزرو آنلاین زمین‌های ورزشی",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className="antialiased">
      <body className="cursor-none">
        <CursorAmbient />
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}

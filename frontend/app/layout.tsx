import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "./providers"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "توپ‌سِت | ToopSet",
  description: "سامانه رزرو آنلاین مجموعه‌های ورزشی",
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
      <body>
        <link rel="preconnect" href="https://tile.openstreetmap.org" />
        <ThemeProvider>
          <div id="toopset-root" className="relative">
            <Providers>{children}</Providers>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

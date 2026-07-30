import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "./providers"
import type { Metadata, Viewport } from "next"
import { pwaConfig } from "@/config/pwa"
import { SkipNav } from "@/components/ui/skip-nav"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const metadata: Metadata = {
  title: pwaConfig.name,
  description: pwaConfig.description,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/logo-1080.webp", sizes: "1080x1080", type: "image/webp" },
      { url: "/icons/logo-512.webp", sizes: "512x512", type: "image/webp" },
    ],
    apple: [
      { url: "/icons/logo-180.webp", sizes: "180x180", type: "image/webp" },
    ],
  },
}

// viewport-fit=cover exposes env(safe-area-inset-*) so fixed chrome can clear
// notches / home-bar on mobile. themeColor tints the browser UI per theme.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: pwaConfig.themeColor },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className="antialiased">
      <body>
        <SkipNav />
        <ThemeProvider>
          <div id="toopset-root" className="relative">
            <Providers>{children}</Providers>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

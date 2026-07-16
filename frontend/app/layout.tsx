import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "./providers"
import type { Metadata, Viewport } from "next"
import { pwaConfig } from "@/config/pwa"

export const metadata: Metadata = {
  title: pwaConfig.name,
  description: pwaConfig.description,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/logo.svg", type: "image/svg+xml" }],
    other: [
      {
        rel: "mask-icon",
        url: "/icons/logo.svg",
      },
    ],
  },
}

// viewport-fit=cover exposes env(safe-area-inset-*) so fixed chrome can clear
// notches / home-bar on mobile. themeColor tints the browser UI per theme.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <link rel="dns-prefetch" href="https://basemaps.cartocdn.com" />
        <link rel="preconnect" href="https://basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://tile.openstreetmap.org" />
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

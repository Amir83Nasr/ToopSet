import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "./providers"
import type { Metadata, Viewport } from "next"
import { pwaConfig } from "@/config/pwa"
import { SkipNav } from "@/components/ui/skip-nav"

export const metadata: Metadata = {
  title: "توپ‌سِت | سامانه هوشمند رزرو آنلاین مجموعه‌های ورزشی و سالن",
  description:
    "با توپ‌سِت (Toopset) به راحتی آنلاین سانس‌های ورزشی، سالن فوتسال، زمین چمن مصنوعی و مجموعه‌های ورزشی را رزرو کنید.",
  keywords: [
    "توپست",
    "توپ ست",
    "toopset",
    "toop set",
    "رزرو مجموعه ورزشی",
    "رزرو سالن",
    "رزرو چمن",
    "رزرو چمن مصنوعی",
    "رزرو سانس فوتبال",
    "رزرو فوتسال",
  ],
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
  openGraph: {
    title: "توپ‌سِت | رزرو آنلاین مجموعه ورزشی و سالن فوتبال",
    description: "سامانه آنلاین رزرو سالن ورزشی و چمن مصنوعی - توپ‌سِت",
    url: "https://toopset.ir",
    siteName: "توپ‌سِت",
    locale: "fa_IR",
    type: "website",
  },
}

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

// اسکیما برای شناسایی هویت برند و خدمات در گوگل
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  name: "توپست",
  alternateName: ["توپ ست", "Toopset", "Toop Set"],
  url: "https://toopset.ir",
  description:
    "سامانه هوشمند رزرو آنلاین مجموعه‌های ورزشی، سالن فوتسال و چمن مصنوعی",
  telephone: "+989306853363",
  email: "amirhossein.nasrollahi.main@gmail.com",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className="antialiased">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <SkipNav />
        <ThemeProvider>
          <div id="toopset-root" className="relative">
            {/* Fixed grid overlay — stays put while content scrolls */}
            <div
              aria-hidden="true"
              className="bg-grid-pattern pointer-events-none fixed inset-0 -z-10"
            />
            <Providers>{children}</Providers>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

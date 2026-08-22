import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "./providers"
import type { Metadata, Viewport } from "next"
import { pwaConfig } from "@/config/pwa"
import { SkipNav } from "@/components/ui/skip-nav"
import { SITE_URL, BRAND } from "@/lib/site"
import { BottomNavWrapper } from "@/components/public/bottom-nav-wrapper"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "توپ‌سِت (ToopSet) | رزرو آنلاین زمین‌های ورزشی",
    template: "%s | توپ‌سِت (ToopSet)",
  },
  description:
    "با توپ‌سِت (ToopSet) به راحتی آنلاین سانس‌های ورزشی، سالن فوتسال، زمین چمن مصنوعی و مجموعه‌های ورزشی قم را رزرو کنید.",
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
    title: `${BRAND} | رزرو آنلاین زمین‌های ورزشی`,
    description:
      "رزرو آنلاین سالن ورزشی، زمین فوتسال و چمن مصنوعی در قم با توپ‌سِت (ToopSet)",
    url: SITE_URL,
    siteName: BRAND,
    locale: "fa_IR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND} | رزرو آنلاین زمین‌های ورزشی`,
    description:
      "رزرو آنلاین سالن ورزشی، زمین فوتسال و چمن مصنوعی در قم با توپ‌سِت (ToopSet)",
    images: ["/icons/logo-1080.webp"],
  },
  robots: {
    index: false,
    follow: true,
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

// اسکیما برای شناسایی هویت برند (توپ‌ست/توپ ست/ToopSet) و خدمات در گوگل
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "توپ‌ست",
    alternateName: [
      "ToopSet",
      "toopset",
      "توپست",
      "توپ‌ست",
      "توپ‌سِت",
      "توپ ست",
    ],
    url: SITE_URL,
    logo: `${SITE_URL}/icons/logo-1080.webp`,
    description:
      "پلتفرم هوشمند رزرو آنلاین زمین‌های ورزشی، سالن فوتسال و چمن مصنوعی در قم",
    telephone: "+989306853363",
    email: "amirhossein.nasrollahi.main@gmail.com",
    areaServed: "قم",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "توپ‌ست (ToopSet)",
    alternateName: [
      "ToopSet",
      "toopset",
      "توپست",
      "توپ‌ست",
      "توپ‌سِت",
      "توپ ست",
    ],
    url: SITE_URL,
    inLanguage: "fa-IR",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/vendors?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    "@id": `${SITE_URL}/#sports-location`,
    name: "توپ‌ست",
    alternateName: [
      "ToopSet",
      "toopset",
      "توپست",
      "توپ‌ست",
      "توپ‌سِت",
      "توپ ست",
    ],
    url: SITE_URL,
    description:
      "سامانه هوشمند رزرو آنلاین مجموعه‌های ورزشی، سالن فوتسال و چمن مصنوعی",
    telephone: "+989306853363",
    email: "amirhossein.nasrollahi.main@gmail.com",
    areaServed: "قم",
  },
]

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
            <Providers>
              {children}
              <BottomNavWrapper />
            </Providers>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

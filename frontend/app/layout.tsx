import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "./providers"
import type { Metadata, Viewport } from "next"
import { pwaConfig } from "@/config/pwa"
import { SkipNav } from "@/components/ui/skip-nav"
import { SITE_URL, BRAND } from "@/lib/site"
import { BottomNavWrapper } from "@/components/public/bottom-nav-wrapper"
import { BootSplash } from "@/components/pwa/boot-splash"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "توپ‌سِت | رزرو آنلاین زمین‌های ورزشی",
    template: "%s | توپ‌سِت",
  },
  description:
    "با توپ‌سِت به راحتی آنلاین سانس‌های ورزشی، سالن فوتسال، زمین چمن مصنوعی و مجموعه‌های ورزشی قم را رزرو کنید.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/square.svg", type: "image/svg+xml" }],
    shortcut: "/icons/square.svg",
    apple: [{ url: "/icons/square.svg" }],
  },
  openGraph: {
    title: `${BRAND} | رزرو آنلاین زمین‌های ورزشی`,
    description:
      "رزرو آنلاین سالن ورزشی، زمین فوتسال و چمن مصنوعی در قم با توپ‌سِت (ToopSet)",
    url: SITE_URL,
    siteName: BRAND,
    locale: "fa_IR",
    type: "website",
    images: [{ url: "/icons/square.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: `${BRAND} | رزرو آنلاین زمین‌های ورزشی`,
    description:
      "رزرو آنلاین سالن ورزشی، زمین فوتسال و چمن مصنوعی در قم با توپ‌سِت (ToopSet)",
    images: ["/icons/square.png"],
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
    { media: "(prefers-color-scheme: light)", color: pwaConfig.themeColor },
    { media: "(prefers-color-scheme: dark)", color: pwaConfig.themeColorDark },
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
    logo: `${SITE_URL}/icons/logo.svg`,
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
        <BootSplash />
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

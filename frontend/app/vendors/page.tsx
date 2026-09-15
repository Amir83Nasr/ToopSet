import type { Metadata } from "next"
import { getApiBase } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { SITE_URL } from "@/lib/site"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { VendorsExplorer } from "./vendors-explorer"
import type { Vendor } from "./vendors-explorer"

export const metadata: Metadata = {
  title: "رزرو آنلاین سالن فوتسال و مجموعه ورزشی در قم",
  description:
    "لیست مجموعه‌های ورزشی قم: سالن فوتسال، زمین چمن مصنوعی، والیبال و بسکتبال. مقایسه قیمت و امکانات و رزرو آنلاین سانس بدون تماس تلفنی با توپ‌سِت (ToopSet).",
  alternates: { canonical: "/vendors" },
  openGraph: {
    title: "مجموعه‌های ورزشی قم | توپ‌سِت (ToopSet)",
    description:
      "جستجو، مقایسه و رزرو آنلاین سانس سالن فوتسال و چمن مصنوعی در قم",
    type: "website",
    locale: "fa_IR",
    url: `${SITE_URL}/vendors`,
    images: [{ url: "/icons/square.png", width: 512, height: 512 }],
  },
}

async function getInitialVendors(): Promise<{
  vendors: Vendor[]
  total: number
}> {
  try {
    const res = await fetch(
      `${getApiBase()}/api/v1/vendors?is_active=true&limit=12`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return { vendors: [], total: 0 }
    return (await res.json()) as { vendors: Vendor[]; total: number }
  } catch {
    return { vendors: [], total: 0 }
  }
}

export default async function VendorsServerPage() {
  const { vendors, total } = await getInitialVendors()

  const itemListJsonLd =
    vendors.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: vendors.map((v, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}/vendors/${v.id}`,
            name: v.name,
          })),
        }
      : null

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <main id="main-content" className="relative flex-1 pt-16">
        <section className="relative overflow-hidden px-4 py-6 md:py-8">
          <div className="relative z-10 mx-auto max-w-7xl px-4">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                رزرو آنلاین <span className="text-primary">سالن فوتسال</span> و
                مجموعه ورزشی در قم
              </h1>
              <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
                {total > 0
                  ? `${toPersianDigits(total)} مجموعه ورزشی فعال در قم — مقایسه کنید و آنلاین رزرو کنید`
                  : "مجموعه ورزشی مورد نظر خود را پیدا کنید"}
              </p>
            </div>

            {/* ── Interactive search/filter/map (client, with pagination) ── */}
            <div className="mt-8">
              <VendorsExplorer />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { getApiBase } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { SITE_URL } from "@/lib/site"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { Card } from "@/components/ui/card"
import { Building2, Star, MapPin } from "lucide-react"
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

function formatPrice(price: number | null): string {
  if (price == null) return "—"
  const formattedNumber = new Intl.NumberFormat("fa-IR", {
    useGrouping: true,
  })
    .format(price)
    .replace(/,/g, "٬")
  return `${formattedNumber} تومان`
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

            {/* ── SSR vendor list (SEO) ── */}
            {vendors.length > 0 && (
              <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {vendors.map((vendor) => {
                  const rating =
                    vendor.average_rating > 0
                      ? vendor.average_rating.toFixed(1)
                      : null
                  return (
                    <li key={vendor.id}>
                      <Link
                        href={`/vendors/${vendor.id}`}
                        className="group block"
                      >
                        <Card className="gap-0 overflow-hidden rounded-[1.25rem] border-0 bg-card p-0 shadow-sm ring-0 transition-shadow duration-300 ease-out group-hover:shadow-xl">
                          <div className="relative aspect-16/11 overflow-hidden bg-muted">
                            {vendor.main_image || vendor.images?.[0] ? (
                              <Image
                                src={vendor.main_image || vendor.images![0]}
                                alt={`رزرو آنلاین ${vendor.name} — ${vendor.address}`}
                                fill
                                loading="lazy"
                                className="object-cover"
                                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center">
                                <Building2 className="size-10 text-muted-foreground/40" />
                              </div>
                            )}
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
                            {rating && (
                              <div className="absolute start-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white shadow-md backdrop-blur-sm">
                                <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                                <span className="tabular-nums">
                                  {toPersianDigits(rating)}
                                </span>
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 z-10 p-4">
                              <h2 className="text-base leading-snug font-bold text-white drop-shadow-sm">
                                {vendor.name}
                              </h2>
                              <p className="mt-1.5 flex items-center gap-1 text-xs text-white/75">
                                <MapPin className="size-3.5 shrink-0" />
                                <span className="line-clamp-1">
                                  {vendor.address}
                                </span>
                              </p>
                              {vendor.base_price != null && (
                                <div className="mt-3 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 backdrop-blur-md">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="inline-flex items-center rounded bg-white/15 px-1 py-0.5 text-[11px] leading-none font-semibold text-white">
                                      شروع قیمت از
                                    </span>
                                    <span className="text-sm font-bold text-white">
                                      {formatPrice(vendor.base_price)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* ── Interactive search/filter/map (client) ── */}
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

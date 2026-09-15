import type { Metadata } from "next"
import Link from "next/link"
import { getApiBase } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { SITE_URL } from "@/lib/site"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { Button } from "@/components/ui/button"
import { MapPin, Star, CalendarCheck2 } from "lucide-react"

export interface LandingSport {
  slug: "futsal" | "football" | "volleyball" | "basketball"
  sportParam: string
  label: string
  h1Keyword: string
  intro: string[]
  bullets: string[]
  faqs: { q: string; a: string }[]
}

export interface LandingVendor {
  id: number
  name: string
  address: string
  average_rating: number
  base_price: number | null
}

function formatPrice(price: number | null): string {
  if (price == null) return "—"
  return `${new Intl.NumberFormat("fa-IR", { useGrouping: true }).format(price).replace(/,/g, "٬")} تومان`
}

async function getSportVendors(sportParam: string): Promise<LandingVendor[]> {
  try {
    const res = await fetch(
      `${getApiBase()}/api/v1/vendors?is_active=true&limit=12&sport_type=${sportParam}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data = (await res.json()) as { vendors?: LandingVendor[] }
    return data.vendors ?? []
  } catch {
    return []
  }
}

export function landingMetadata(sport: LandingSport): Metadata {
  const path = `/${sport.slug}-qom`
  const title = `رزرو ${sport.h1Keyword} در قم`
  const description = `${sport.intro[0]} لیست ${sport.h1Keyword} قم با قیمت، آدرس و امتیاز — رزرو آنلاین سانس بدون تماس تلفنی با توپ‌سِت (ToopSet).`
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | توپ‌سِت (ToopSet)`,
      description,
      type: "website",
      locale: "fa_IR",
      url: `${SITE_URL}${path}`,
      images: [{ url: "/icons/square.png", width: 512, height: 512 }],
    },
    robots: { index: true, follow: true },
  }
}

export async function LandingPage({ sport }: { sport: LandingSport }) {
  const vendors = await getSportVendors(sport.sportParam)

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sport.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <main id="main-content" className="relative flex-1 pt-16">
        <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            رزرو {sport.h1Keyword} در قم
          </h1>

          {sport.intro.map((p, i) => (
            <p key={i} className="mt-5 leading-8 text-muted-foreground">
              {p}
            </p>
          ))}

          <ul className="mt-6 space-y-2">
            {sport.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm leading-7">
                <CalendarCheck2 className="mt-1.5 size-4 shrink-0 text-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/vendors">مشاهده همه مجموعه‌های قم</Link>
            </Button>
          </div>

          {vendors.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                {sport.label}‌های قم برای رزرو
              </h2>
              <ul className="mt-5 space-y-3">
                {vendors.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/vendors/${v.id}`}
                      className="group flex items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold group-hover:text-primary">
                          {v.name}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="line-clamp-1">{v.address}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs">
                        {v.average_rating > 0 && (
                          <span className="flex items-center gap-1 font-semibold">
                            <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                            {toPersianDigits(v.average_rating.toFixed(1))}
                          </span>
                        )}
                        {v.base_price != null && (
                          <span className="font-bold text-primary">
                            از {formatPrice(v.base_price)}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-12">
            <h2 className="text-xl font-bold tracking-tight md:text-2xl">
              سوالات پرتکرار
            </h2>
            <div className="mt-5 space-y-4">
              {sport.faqs.map((f) => (
                <div key={f.q} className="rounded-xl border bg-card p-4">
                  <h3 className="font-semibold">{f.q}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site"

import { getVendorDetail, getVendorReviews } from "./vendor-loader"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const vendor = await getVendorDetail(id)
  if (!vendor) return {}

  const description = `رزرو آنلاین سانس ${vendor.name} در قم — ${vendor.address}؛ ساعات آزاد را ببینید و بدون تماس تلفنی رزرو کنید.`
  const image = vendor.main_image || vendor.images?.[0]

  return {
    title: `رزرو ${vendor.name} در قم`,
    description,
    alternates: { canonical: `/vendors/${id}` },
    openGraph: {
      title: `${vendor.name} | توپ‌سِت (ToopSet)`,
      description: `رزرو آنلاین سانس ${vendor.name} در قم`,
      type: "website",
      locale: "fa_IR",
      url: `${SITE_URL}/vendors/${id}`,
      ...(image ? { images: [{ url: image, alt: vendor.name }] } : {}),
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function VendorLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [vendor, { total }] = await Promise.all([
    getVendorDetail(id),
    getVendorReviews(id),
  ])

  const breadcrumb = vendor
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "خانه",
            item: `${SITE_URL}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "مجموعه‌های ورزشی",
            item: `${SITE_URL}/vendors`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: vendor.name,
            item: `${SITE_URL}/vendors/${id}`,
          },
        ],
      }
    : null

  const sportsLocation = vendor
    ? {
        "@context": "https://schema.org",
        "@type": "SportsActivityLocation",
        name: vendor.name,
        url: `${SITE_URL}/vendors/${id}`,
        address: {
          "@type": "PostalAddress",
          streetAddress: vendor.address,
          addressLocality: "قم",
          addressCountry: "IR",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: vendor.latitude,
          longitude: vendor.longitude,
        },
        ...(vendor.manager_phone ? { telephone: vendor.manager_phone } : {}),
        ...(total > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: vendor.average_rating,
                reviewCount: total,
              },
            }
          : {}),
      }
    : null

  return (
    <>
      {breadcrumb && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
        />
      )}
      {sportsLocation && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsLocation) }}
        />
      )}
      {children}
    </>
  )
}

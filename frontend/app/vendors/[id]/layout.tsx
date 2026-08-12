import type { Metadata } from "next"
import { cache } from "react"
import { getApiBase } from "@/lib/api"
import { SITE_URL } from "@/lib/site"

interface VendorMeta {
  name?: string
}

const getVendorName = cache(async (id: string): Promise<string | null> => {
  try {
    const res = await fetch(`${getApiBase()}/api/v1/vendors/${id}`, {
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as VendorMeta
    return data.name || null
  } catch {
    return null
  }
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const name = await getVendorName(id)
  if (!name) return {}

  return {
    title: name,
    description: `رزرو آنلاین سانس ${name} در قم — ساعات آزاد را ببینید و بدون تماس تلفنی رزرو کنید.`,
    alternates: { canonical: `/vendors/${id}` },
    openGraph: {
      title: `${name} | توپ‌سِت (ToopSet)`,
      description: `رزرو آنلاین سانس ${name} در قم`,
      type: "website",
      locale: "fa_IR",
      images: [{ url: "/icons/logo-1080.webp", alt: name }],
    },
    robots: {
      index: false,
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
  const name = await getVendorName(id)
  const breadcrumb = name
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
            name,
            item: `${SITE_URL}/vendors/${id}`,
          },
        ],
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
      {children}
    </>
  )
}

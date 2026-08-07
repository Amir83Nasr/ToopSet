import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

interface VendorItem {
  id: number
}

interface VendorListResponse {
  vendors: VendorItem[]
  next_cursor: string | null
}

const MAX_PAGES = 50

async function fetchVendors(): Promise<VendorItem[]> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  const all: VendorItem[] = []
  let cursor: string | null = null

  for (let i = 0; i < MAX_PAGES; i++) {
    const qs = new URLSearchParams({ limit: "100" })
    if (cursor) qs.set("cursor", cursor)
    const res = await fetch(`${base}/api/v1/vendors?${qs}`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) throw new Error(`vendors fetch failed: ${res.status}`)
    const data = (await res.json()) as VendorListResponse
    all.push(...data.vendors)
    if (!data.next_cursor) break
    cursor = data.next_cursor
  }
  return all
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/vendors`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ]

  // Never fail the build when the API is unavailable — fall back to static pages.
  try {
    const vendors = await fetchVendors()
    const vendorUrls: MetadataRoute.Sitemap = vendors.map((vendor) => ({
      url: `${SITE_URL}/vendors/${vendor.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))
    return [...staticPages, ...vendorUrls]
  } catch {
    return staticPages
  }
}

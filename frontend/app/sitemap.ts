import type { MetadataRoute } from "next"
import { getApiBase } from "@/lib/api"
import { SITE_URL } from "@/lib/site"

interface SitemapVendor {
  id: number
}

// ponytail: API exposes no updated_at — lastModified is build time.
// Upgrade path: add updated_at to VendorListItemResponse, use it here.
// ponytail: capped at 100 vendors — paginate with skip when Qom exceeds that.
async function getVendorIds(): Promise<number[]> {
  try {
    const res = await fetch(
      `${getApiBase()}/api/v1/vendors?is_active=true&limit=100`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data = (await res.json()) as { vendors?: SitemapVendor[] }
    return (data.vendors ?? []).map((v) => v.id)
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const vendorIds = await getVendorIds()

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/vendors`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...vendorIds.map((id) => ({
      url: `${SITE_URL}/vendors/${id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]
}

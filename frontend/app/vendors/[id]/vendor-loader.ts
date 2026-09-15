import { cache } from "react"
import { getApiBase } from "@/lib/api"
import type { VendorData, Review } from "@/components/vendors/vendor-shared"

export const getVendorDetail = cache(
  async (id: string): Promise<VendorData | null> => {
    try {
      const res = await fetch(`${getApiBase()}/api/v1/vendors/${id}`, {
        signal: AbortSignal.timeout(4000),
        next: { revalidate: 300 },
      })
      if (!res.ok) return null
      return (await res.json()) as VendorData
    } catch {
      return null
    }
  }
)

export const getVendorReviews = cache(
  async (id: string): Promise<{ reviews: Review[]; total: number }> => {
    try {
      const res = await fetch(
        `${getApiBase()}/api/v1/vendors/${id}/reviews?limit=5`,
        {
          signal: AbortSignal.timeout(4000),
          next: { revalidate: 300 },
        }
      )
      if (!res.ok) return { reviews: [], total: 0 }
      const data = (await res.json()) as {
        reviews?: Review[]
        total?: number
      }
      return { reviews: data.reviews ?? [], total: data.total ?? 0 }
    } catch {
      return { reviews: [], total: 0 }
    }
  }
)

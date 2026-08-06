import { getApiBase } from "@/lib/api"

/**
 * Resolve auth-page hero slide image URLs on the **server** so the hero
 * paints immediately — no client fetch round-trip, no placeholder flash.
 * Returns [] (→ default art) when the endpoint fails or has no image slides.
 */
export async function getHeroSlideUrls(): Promise<string[]> {
  try {
    const res = await fetch(
      `${getApiBase()}/api/v1/settings/public/hero-slides`,
      { cache: "no-store", signal: AbortSignal.timeout(4000) }
    )
    if (!res.ok) return []
    const data: unknown = await res.json()
    if (!Array.isArray(data)) return []
    return data.filter(
      (s): s is string =>
        typeof s === "string" && (s.startsWith("http") || s.startsWith("/"))
    )
  } catch {
    return []
  }
}

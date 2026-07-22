// ── Web App Manifest ───────────────────────────────────────────────────────────
// Served at /manifest.webmanifest by Next.js App Router.
// Values come from the centralized PWA config — edit config/pwa.ts, not here.

import type { MetadataRoute } from "next"
import { pwaConfig } from "@/config/pwa"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: pwaConfig.name,
    short_name: pwaConfig.shortName,
    description: pwaConfig.description,
    start_url: pwaConfig.startUrl,
    display: pwaConfig.display,
    orientation: pwaConfig.orientation,
    theme_color: pwaConfig.themeColor,
    background_color: pwaConfig.backgroundColor,
    lang: pwaConfig.language,
    categories: [...pwaConfig.categories],
    icons: [
      {
        src: "/icons/logo.svg",
        purpose: "any",
      },
    ],
  }
}

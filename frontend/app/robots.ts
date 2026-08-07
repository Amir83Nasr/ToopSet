import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/admin",
        "/manager",
        "/api",
        "/auth",
        "/profile",
        "/login",
        "/register",
        "/otp",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

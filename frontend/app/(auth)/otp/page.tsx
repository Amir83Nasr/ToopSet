import { Suspense } from "react"
import { getHeroSlideUrls } from "@/lib/hero-slides"
import OtpPageContent from "./otp-content"

export const dynamic = "force-dynamic"

export default async function OtpPage() {
  const heroUrls = await getHeroSlideUrls()
  return (
    <Suspense fallback={null}>
      <OtpPageContent heroUrls={heroUrls} />
    </Suspense>
  )
}

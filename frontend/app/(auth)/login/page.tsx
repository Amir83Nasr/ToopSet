import { Suspense } from "react"
import { getHeroSlideUrls } from "@/lib/hero-slides"
import LoginPageContent from "./login-content"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const heroUrls = await getHeroSlideUrls()
  return (
    <Suspense fallback={null}>
      <LoginPageContent heroUrls={heroUrls} />
    </Suspense>
  )
}

import { Suspense } from "react"
import { getHeroSlideUrls } from "@/lib/hero-slides"
import RegisterPageInner from "./register-content"

export const dynamic = "force-dynamic"

export default async function RegisterPage() {
  const heroUrls = await getHeroSlideUrls()
  return (
    <Suspense fallback={null}>
      <RegisterPageInner heroUrls={heroUrls} />
    </Suspense>
  )
}

import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { HeroSection } from "@/components/public/hero-section"

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="relative overflow-x-hidden pt-16">
        <HeroSection />
      </main>
      <SiteFooter />
    </div>
  )
}

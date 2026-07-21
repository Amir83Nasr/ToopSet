import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { HeroSection } from "@/components/public/hero-section"
import { AboutSection } from "@/components/public/about-section"

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="relative flex-1 pt-16">
        <HeroSection />
        <AboutSection />
      </main>
      <SiteFooter />
    </div>
  )
}

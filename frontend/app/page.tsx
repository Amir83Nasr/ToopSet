import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { HeroSection } from "@/components/public/hero-section"
import { HowItWorksSection } from "@/components/public/how-it-works-section"
import { AboutSection } from "@/components/public/about-section"
import { Metadata } from "next"

export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
  },
}

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main id="main-content" className="relative flex-1 pt-16">
        <HeroSection />
        <HowItWorksSection />
        <AboutSection />
      </main>
      <SiteFooter />
    </div>
  )
}

import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { HeroSection } from "@/components/public/hero-section"
import { FeaturedVendorsCarousel } from "@/components/public/featured-vendors-carousel"
import { HowItWorksSection } from "@/components/public/how-it-works-section"
import { AboutSection } from "@/components/public/about-section"
import { CriteriaSection } from "@/components/public/criteria-section"
import { BookingTimelineSection } from "@/components/public/booking-timeline-section"
import { FaqSection } from "@/components/public/faq-section"
import { OwnerCtaSection } from "@/components/public/owner-cta-section"
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
        <FeaturedVendorsCarousel />
        <HowItWorksSection />
        <AboutSection />
        <CriteriaSection />
        <BookingTimelineSection />
        <FaqSection />
        <OwnerCtaSection />
      </main>
      <SiteFooter />
    </div>
  )
}

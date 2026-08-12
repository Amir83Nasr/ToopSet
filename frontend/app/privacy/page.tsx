import type { Metadata } from "next"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { PrivacyTermsContent } from "@/components/public/privacy-terms-content"

export const metadata: Metadata = {
  title: "حریم خصوصی",
  description:
    "حریم خصوصی و نحوه استفاده از اطلاعات در سامانه توپ‌سِت (ToopSet)",
  alternates: { canonical: "/privacy" },
  robots: {
    index: false,
    follow: true,
  },
}

export default function PrivacyPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main
        id="main-content"
        className="relative flex-1 overflow-x-hidden pt-16"
      >
        <div className="pt-safe mx-auto max-w-3xl px-4 pb-16 md:py-24">
          <PrivacyTermsContent settingKey="privacy_text" />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

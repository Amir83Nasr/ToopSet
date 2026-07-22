import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { PrivacyTermsContent } from "@/components/public/privacy-terms-content"

export default function TermsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main
        id="main-content"
        className="relative flex-1 overflow-x-hidden pt-16"
      >
        <div className="relative mx-auto max-w-3xl px-4 py-16 md:py-24">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            قوانین و مقررات
          </h1>
          <PrivacyTermsContent settingKey="rules_text" />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

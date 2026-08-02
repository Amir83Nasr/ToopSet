"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { OtpForm } from "@/components/auth/otp-form"
import { AuthHeroSlides } from "@/components/auth/auth-hero-slides"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

function OtpPageContent() {
  const { sendOtp, verifyOtp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || undefined
  const reason = searchParams.get("reason")
  const phone = searchParams.get("phone") || ""
  const mode = searchParams.get("mode")
  const purpose = mode === "password_reset" ? "password_reset" : "login"
  const successRedirect =
    purpose === "password_reset"
      ? "/dashboard/settings?reset_password=1"
      : redirect

  const reasonMessages: Record<string, string> = {
    session_expired: "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.",
    login_required: "برای دسترسی به این بخش باید وارد شوید.",
    phone_verification_required:
      "برای رزرو سانس، شماره موبایل خود را با کد پیامکی تأیید کنید.",
  }
  const reasonMessage = reason ? reasonMessages[reason] : null

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden rounded-3xl bg-muted lg:m-4 lg:block">
        <AuthHeroSlides />
      </div>
      <div className="relative flex flex-col items-center justify-center p-6 md:p-10">
        <div className="absolute inset-e-6 top-6">
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowRight className="me-1.5 size-4" />
              بازگشت به صفحه اصلی
            </Link>
          </Button>
        </div>
        <div className="flex w-full max-w-xs flex-col justify-center">
          {reasonMessage && (
            <div className="mb-6 w-fit self-center rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary dark:border-primary/20 dark:bg-primary/10 dark:text-primary">
              {reasonMessage}
            </div>
          )}
          <OtpForm
            sendOtp={sendOtp}
            verifyOtp={verifyOtp}
            redirect={successRedirect}
            initialPhone={phone}
            purpose={purpose}
            onLoginClick={(phone) => {
              const params = new URLSearchParams()
              params.set("phone", phone)
              if (redirect) params.set("redirect", redirect)
              router.push(`/login?${params.toString()}`)
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default function OtpPage() {
  return (
    <Suspense fallback={null}>
      <OtpPageContent />
    </Suspense>
  )
}

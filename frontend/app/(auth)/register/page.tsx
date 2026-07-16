"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { RegisterForm } from "@/components/auth/register-form"
import { AuthHeroSlides } from "@/components/auth/auth-hero-slides"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

function RegisterPageInner() {
  const { register } = useAuth()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || undefined

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
        <div className="w-full max-w-xs">
          <RegisterForm register={register} redirect={redirect} />
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  )
}

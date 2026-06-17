"use client"

import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { LoginForm } from "@/components/auth/login-form"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

function LoginPageContent() {
  const { login } = useAuth()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || undefined
  const reason = searchParams.get("reason")

  const reasonMessages: Record<string, string> = {
    session_expired: "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.",
    login_required: "برای دسترسی به این بخش باید وارد شوید.",
  }
  const reasonMessage = reason ? reasonMessages[reason] : null

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowRight className="ml-2 size-4" />
              بازگشت به صفحه اصلی
            </Link>
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {reasonMessage && (
              <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary dark:border-primary/20 dark:bg-primary/10 dark:text-primary">
                {reasonMessage}
              </div>
            )}
            <LoginForm login={login} redirect={redirect} />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/futsal.svg"
          alt=""
          fill
          className="absolute inset-0 size-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}

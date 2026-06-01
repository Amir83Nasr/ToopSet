"use client"

import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { LoginForm } from "@/components/auth/login-form"

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
    <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-b from-background to-muted/50 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <Image
          src="/favicon.svg"
          alt="توپ‌سِت"
          width={28}
          height={28}
          className="size-7"
        />
        <span className="text-lg font-bold tracking-tight">توپ‌سِت</span>
      </Link>

      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        {reasonMessage && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/50 dark:text-amber-200">
            {reasonMessage}
          </div>
        )}
        <LoginForm login={login} redirect={redirect} />
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

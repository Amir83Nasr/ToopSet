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
    <div className="grid min-h-svh lg:grid-cols-[1fr_2fr]">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <Image
              src="/favicon.svg"
              alt="توپ‌سِت"
              width={24}
              height={24}
              className="size-6"
            />
            توپ‌سِت
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {reasonMessage && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/50 dark:text-amber-200">
                {reasonMessage}
              </div>
            )}
            <LoginForm login={login} redirect={redirect} />
          </div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden lg:block">
        <Image
          src="/futsal.svg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-br from-black/30 to-transparent" />
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

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { Volleyball } from "lucide-react"

export default function HomePage() {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard")
    }
  }, [loading, isAuthenticated, router])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (isAuthenticated) return null

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Volleyball className="size-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">توپ سِت</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            سامانه هوشمند رزرو آنلاین زمین‌های ورزشی
            <br />
            والیبال، بسکتبال، فوتسال و هندبال
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            ورود
          </Link>
          <Link
            href="/register"
            className="inline-flex h-10 items-center justify-center rounded-lg border bg-background px-6 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
          >
            ثبت‌نام
          </Link>
        </div>
      </div>
    </div>
  )
}

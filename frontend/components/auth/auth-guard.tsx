"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Loader2 } from "lucide-react"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.replace(
        `/login?reason=login_required&redirect=${encodeURIComponent(pathname)}`
      )
    }
  }, [loading, user, router, pathname])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <span>برای ادامه باید وارد شوید؛ در حال انتقال به صفحه ورود...</span>
      </div>
    )
  }

  return <>{children}</>
}

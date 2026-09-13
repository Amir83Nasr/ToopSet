"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

/**
 * Non-blocking auth gate for the dashboard layout.
 *
 * Children render immediately so entering the dashboard feels instant — each
 * page paints its own skeleton while its data (and the auth check) load in
 * parallel. Only a confirmed logged-out state bounces to /login; real access
 * control is server-side (API 401s), this is presentational.
 */
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

  return <>{children}</>
}

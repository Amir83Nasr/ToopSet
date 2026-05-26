"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function DashboardRouter() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      const roleRoutes: Record<string, string> = {
        admin: "/dashboard/admin",
        manager: "/dashboard/manager",
        user: "/dashboard/user",
      }
      router.replace(roleRoutes[user.role] || "/dashboard/user")
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  return null
}

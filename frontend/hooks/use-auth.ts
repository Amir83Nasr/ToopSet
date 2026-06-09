"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ApiError, api, clearTokens, setTokens } from "@/lib/api"
import { getCookie } from "@/lib/cookies"
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "@/types/auth"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refreshUser = useCallback(async () => {
    const token = getCookie("access_token")
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const data = await api<{
        id: number
        phone: string
        full_name: string
        role: string
        is_active: boolean
        avatar_url?: string | null
        created_at: string
      }>("/api/v1/auth/me")
      setUser({ ...data, role: data.role as User["role"] })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearTokens()
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser()
  }, [refreshUser])

  useEffect(() => {
    const handler = () => {
      clearTokens()
      setUser(null)
      setLoading(false)
    }
    window.addEventListener("auth:expired", handler)
    return () => window.removeEventListener("auth:expired", handler)
  }, [])

  const login = useCallback(
    async (data: LoginRequest, redirect?: string) => {
      const res = await api<AuthResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      })
      setTokens(res.access_token, res.refresh_token)
      setUser(res.user)
      if (redirect && redirect.startsWith("/")) {
        router.push(redirect)
      } else {
        router.push("/dashboard")
      }
    },
    [router]
  )

  const register = useCallback(
    async (data: RegisterRequest) => {
      const res = await api<AuthResponse>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      })
      setTokens(res.access_token, res.refresh_token)
      setUser(res.user)
      router.push("/dashboard")
    },
    [router]
  )

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
    router.push("/")
  }, [router])

  return {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  }
}

export type UseAuthReturn = ReturnType<typeof useAuth>

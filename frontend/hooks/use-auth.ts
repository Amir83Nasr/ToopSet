"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api, clearTokens, setTokens } from "@/lib/api"
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

  useEffect(() => {
    const token = getCookie("access_token")
    if (!token) {
      setLoading(false)
      return
    }
    api<{
      id: number
      phone: string
      full_name: string
      role: string
      is_active: boolean
      created_at: string
    }>("/api/v1/auth/me")
      .then((data) => {
        setUser({ ...data, role: data.role as User["role"] })
      })
      .catch(() => {
        clearTokens()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

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
        router.push("/")
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
      router.push("/")
    },
    [router]
  )

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
    router.push("/")
  }, [router])

  return { user, loading, login, register, logout, isAuthenticated: !!user }
}

export type UseAuthReturn = ReturnType<typeof useAuth>

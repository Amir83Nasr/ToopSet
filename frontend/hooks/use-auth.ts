"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ApiError,
  api,
  clearTokens,
  setTokens,
  clearInflightCache,
} from "@/lib/api"
import { getCookie } from "@/lib/cookies"
import type {
  AuthResponse,
  LoginOptionsRequest,
  LoginOptionsResponse,
  LoginRequest,
  RegisterRequest,
  SendOtpRequest,
  SendOtpResponse,
  User,
  VerifyOtpRequest,
} from "@/types/auth"

type CurrentUserResponse = {
  id: number
  phone: string
  full_name: string
  role: string
  is_active: boolean
  has_password: boolean
  avatar_url?: string | null
  created_at: string
}

// ── User cache with 30s expiry ────────────────────────────────────────────

const USER_CACHE_TTL = 30_000 // 30 seconds

let cachedUserPromise: { promise: Promise<User | null>; ts: number } | null =
  null

async function fetchCurrentUser(): Promise<User | null> {
  const token = getCookie("access_token")
  if (!token) return null

  // Return cached user if within TTL
  const now = Date.now()
  if (cachedUserPromise && now - cachedUserPromise.ts < USER_CACHE_TTL) {
    return cachedUserPromise.promise
  }

  const promise = api<CurrentUserResponse>("/api/v1/auth/me")
    .then((data) => ({ ...data, role: data.role as User["role"] }))
    .catch((err) => {
      if (err instanceof ApiError && [401, 403, 404].includes(err.status)) {
        clearTokens()
      }
      return null
    })
    .finally(() => {
      // Leave cached promise for TTL; next caller past TTL creates fresh
    })

  cachedUserPromise = { promise, ts: now }
  return promise
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refreshUser = useCallback(async () => {
    // Skip API call for anonymous visitors — no token means no user
    if (!getCookie("access_token")) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      setUser(await fetchCurrentUser())
    } catch {
      setUser(null)
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
        credentials: "include",
        body: JSON.stringify(data),
      })
      setTokens(res.access_token)
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
    async (data: RegisterRequest, redirect?: string) => {
      const res = await api<AuthResponse>("/api/v1/auth/register", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify(data),
      })
      setTokens(res.access_token)
      setUser(res.user)
      if (redirect && redirect.startsWith("/")) {
        router.push(redirect)
      } else {
        router.push("/")
      }
    },
    [router]
  )

  const checkLoginOptions = useCallback(async (data: LoginOptionsRequest) => {
    return api<LoginOptionsResponse>("/api/v1/auth/login/options", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }, [])

  // ── OTP methods ──────────────────────────────────────────────────

  const sendOtp = useCallback(async (data: SendOtpRequest) => {
    const res = await api<SendOtpResponse>("/api/v1/auth/otp/send", {
      method: "POST",
      body: JSON.stringify(data),
    })
    return res
  }, [])

  const verifyOtp = useCallback(
    async (data: VerifyOtpRequest, redirect?: string) => {
      const res = await api<AuthResponse>("/api/v1/auth/otp/verify", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify(data),
      })
      setTokens(res.access_token)
      setUser(res.user)
      if (redirect && redirect.startsWith("/")) {
        router.push(redirect)
      } else {
        router.push("/")
      }
    },
    [router]
  )

  const logout = useCallback(async () => {
    try {
      await api("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } catch {
      // Local logout should still clear UI state if the server session is already gone.
    }
    clearTokens()
    setUser(null)
    cachedUserPromise = null
    clearInflightCache()
    router.push("/")
  }, [router])

  return {
    user,
    loading,
    login,
    checkLoginOptions,
    register,
    sendOtp,
    verifyOtp,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  }
}

export type UseAuthReturn = ReturnType<typeof useAuth>

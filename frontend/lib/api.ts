/**
 * Get the backend API base URL.
 *
 * On the **server** (SSR): uses NEXT_PUBLIC_API_URL env var — `localhost` is fine
 * since both run on the same machine.
 *
 * On the **client** (browser): if the configured URL points to a loopback address
 * (localhost/127.0.0.1/0.0.0.0), replace the hostname with the browser's current
 * hostname so LAN devices (phone on same WiFi) reach the backend at the same IP
 * they used to reach the frontend.  This avoids hardcoding any specific LAN IP.
 */
export function getApiBase(): string {
  if (typeof window === "undefined") {
    // SSR / build-time — use the env var as-is
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  }

  const configured = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  // On the browser: replace loopback hostnames with the page's own hostname
  try {
    const url = new URL(configured)
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)) {
      url.hostname = window.location.hostname
    }
    return url.origin
  } catch {
    return configured
  }
}

const API_BASE = getApiBase()

export function buildAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  return `${API_BASE}${path}`
}

/**
 * Normalize an image URL for use with next/image.
 *
 * Absolute backend URLs (http://localhost:8000/uploads/…) are converted to
 * relative paths so Next.js serves them via its own rewrite proxy, avoiding
 * the private-IP security block in Next.js 15+.
 *
 * Relative paths (/uploads/…) are used as-is — the rewrite handles them.
 */
export function buildVendorImageUrl(url: string | null | undefined): string {
  if (!url) return ""
  // Already a relative path — let the rewrite handle it
  if (url.startsWith("/")) return url
  // Absolute URL — convert to relative for same-origin serving
  try {
    const parsed = new URL(url)
    return parsed.pathname + parsed.search
  } catch {
    return url
  }
}

import * as Sentry from "@sentry/nextjs"
import { setCookie, getCookie, removeCookie } from "./cookies"

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

const enToFa: Record<string, string> = {
  "Invalid phone or password": "شماره تلفن یا رمز عبور اشتباه است",
  "Phone already registered": "این شماره تلفن قبلاً ثبت‌نام کرده است",
  "Not authenticated": "وارد حساب خود نشده‌اید",
  "Account is disabled": "حساب کاربری شما غیرفعال شده است",
  Forbidden: "دسترسی غیرمجاز",
  "Not found": "پیدا نشد",
  "File too large": "حجم فایل بیش از حد مجاز است",
  "Invalid file type": "نوع فایل مجاز نیست",
  "Invalid or expired token": "توکن نامعتبر یا منقضی شده",
  "Invalid refresh token": "توکن رفرش نامعتبر است",
  "Session expired — logged in from another device":
    "نشست شما به پایان رسید — از دستگاه دیگری وارد شده‌اید",
  "Please log in first": "لطفاً ابتدا وارد حساب خود شوید",
  "You do not have permission": "شما دسترسی لازم را ندارید",
  "Invalid credentials": "اطلاعات ورود اشتباه است",
  "Already exists": "قبلاً وجود دارد",
  "No changes detected": "تغییری مشاهده نشد",
  "Operation failed": "عملیات با خطا مواجه شد",
  "Unknown error": "خطای ناشناخته",
  "Request failed": "درخواست با خطا مواجه شد",
  "Upload failed": "آپلود با مشکل مواجه شد",
  "Delete failed": "خطا در حذف",
  Unauthorized: "دسترسی غیرمجاز",
}

function translateMessage(message: string): string {
  return enToFa[message] || message
}

const NO_AUTH_REFRESH_PATHS = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/login/options",
  "/api/v1/auth/register",
  "/api/v1/auth/otp/send",
  "/api/v1/auth/otp/verify",
  "/api/v1/auth/refresh",
])

function shouldAttemptTokenRefresh(path: string): boolean {
  return !NO_AUTH_REFRESH_PATHS.has(path)
}

export function setTokens(access: string) {
  setCookie("access_token", access)
}

export function clearTokens() {
  removeCookie("access_token")
  removeCookie("refresh_token")
}

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      if (!res.ok) {
        clearTokens()
        return false
      }

      const data = await res.json()
      setTokens(data.access_token)
      return true
    } catch {
      clearTokens()
      return false
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getCookie("access_token")

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: options.credentials ?? "include",
    })
  } catch (err) {
    throw new ApiError(
      0,
      `خطا در اتصال به سرور: ${err instanceof Error ? err.message : "نامشخص"}`
    )
  }

  if (res.status === 401) {
    if (!shouldAttemptTokenRefresh(path)) {
      if (path === "/api/v1/auth/refresh") {
        clearTokens()
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:expired"))
        }
        throw new ApiError(
          401,
          "نشست شما به پایان رسیده. لطفاً دوباره وارد شوید."
        )
      }

      const body = await res.json().catch(() => ({ detail: "Unauthorized" }))
      throw new ApiError(401, translateMessage(body.detail || "Unauthorized"))
    }

    const refreshed = await tryRefreshToken()
    if (refreshed) {
      const newToken = getCookie("access_token")
      const retryRes = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers as Record<string, string>),
          Authorization: `Bearer ${newToken}`,
        },
        credentials: options.credentials ?? "include",
      })

      if (!retryRes.ok) {
        const body = await retryRes
          .json()
          .catch(() => ({ detail: "Request failed" }))
        throw new ApiError(
          retryRes.status,
          translateMessage(body.detail || "Request failed")
        )
      }

      return retryRes.json()
    }

    if (!token) {
      const body = await res.json().catch(() => ({ detail: "Unauthorized" }))
      throw new ApiError(401, translateMessage(body.detail || "Unauthorized"))
    }

    clearTokens()
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:expired"))
    }
    throw new ApiError(401, "نشست شما به پایان رسیده. لطفاً دوباره وارد شوید.")
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Unknown error" }))
    if (res.status >= 500) {
      Sentry.captureException(
        new Error(`Server error ${res.status}: ${body.detail}`),
        { tags: { path } }
      )
    }
    throw new ApiError(
      res.status,
      translateMessage(body.detail || "Unknown error")
    )
  }

  if (res.status === 204) {
    return null as T
  }

  return res.json()
}

export interface UploadResult {
  temp_id: string
  url: string
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const token = getCookie("access_token")
  const formData = new FormData()
  formData.append("file", file)

  const headers: Record<string, string> = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const url = `${API_BASE}/api/v1/uploads/vendor-image`

  let res: Response
  try {
    res = await fetch(url, { method: "POST", headers, body: formData })
  } catch (err) {
    console.error("Fetch failed:", err)
    throw new ApiError(
      0,
      `خطا در اتصال به سرور: ${err instanceof Error ? err.message : "نامشخص"}`
    )
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Upload failed" }))
    throw new ApiError(
      res.status,
      translateMessage(body.detail || "Upload failed")
    )
  }

  return res.json()
}

export async function uploadAvatar(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)

  const headers: Record<string, string> = {}
  const token = getCookie("access_token")
  if (token) headers["Authorization"] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/v1/auth/avatar`, {
      method: "POST",
      headers,
      body: formData,
    })
  } catch (err) {
    throw new ApiError(
      0,
      `خطا در اتصال به سرور: ${err instanceof Error ? err.message : "نامشخص"}`
    )
  }

  if (res.status === 401) {
    const refreshed = await tryRefreshToken()
    if (!refreshed) {
      clearTokens()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:expired"))
      }
      throw new ApiError(
        401,
        "نشست شما به پایان رسیده. لطفاً دوباره وارد شوید."
      )
    }
    const newToken = getCookie("access_token")
    headers["Authorization"] = `Bearer ${newToken}`
    try {
      res = await fetch(`${API_BASE}/api/v1/auth/avatar`, {
        method: "POST",
        headers,
        body: formData,
      })
    } catch (err) {
      throw new ApiError(
        0,
        `خطا در اتصال به سرور: ${err instanceof Error ? err.message : "نامشخص"}`
      )
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Upload failed" }))
    if (res.status >= 500) {
      Sentry.captureException(
        new Error(`Server error ${res.status}: ${body.detail}`),
        { tags: { path: "/api/v1/auth/avatar" } }
      )
    }
    throw new ApiError(
      res.status,
      translateMessage(body.detail || "Upload failed")
    )
  }

  const data = await res.json()
  return data.url
}

export async function deleteAvatar(): Promise<void> {
  await api("/api/v1/auth/avatar", { method: "DELETE" })
}

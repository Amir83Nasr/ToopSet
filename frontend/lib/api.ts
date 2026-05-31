const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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

export function setTokens(access: string, refresh: string) {
  setCookie("access_token", access)
  setCookie("refresh_token", refresh)
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
    const refreshToken = getCookie("refresh_token")
    if (!refreshToken) {
      clearTokens()
      return false
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!res.ok) {
        clearTokens()
        return false
      }

      const data = await res.json()
      setTokens(data.access_token, data.refresh_token)
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

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    if (path === "/api/v1/auth/refresh") {
      clearTokens()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:expired"))
      }
      throw new ApiError(401, "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.")
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
      })

      if (!retryRes.ok) {
        const body = await retryRes.json().catch(() => ({ detail: "Request failed" }))
        throw new ApiError(retryRes.status, body.detail || "Request failed")
      }

      return retryRes.json()
    }

    clearTokens()
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:expired"))
    }
    throw new ApiError(401, "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.")
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new ApiError(res.status, body.detail || "Request failed")
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

  const url = `${API_BASE}/api/v1/uploads/court-image`
  console.log("Uploading to:", url, "file:", file.name, "size:", file.size, "type:", file.type)

  let res: Response
  try {
    res = await fetch(url, { method: "POST", headers, body: formData })
  } catch (err) {
    console.error("Fetch failed:", err)
    throw new ApiError(0, `Network error: ${err instanceof Error ? err.message : "unknown"}`)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Upload failed" }))
    throw new ApiError(res.status, body.detail || "Upload failed")
  }

  return res.json()
}

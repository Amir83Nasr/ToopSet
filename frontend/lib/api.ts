const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

function getToken(key: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(key)
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access)
  localStorage.setItem("refresh_token", refresh)
}

export function clearTokens() {
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
}

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Uses a singleton promise to prevent multiple simultaneous refresh calls.
 */
async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise

  isRefreshing = true
  refreshPromise = (async () => {
    const refreshToken = getToken("refresh_token")
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
  const token = getToken("access_token")

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
    // Don't retry the refresh endpoint itself
    if (path === "/api/v1/auth/refresh") {
      clearTokens()
      throw new ApiError(401, "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.")
    }

    // Try to refresh the token
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      // Retry the original request with new token
      const newToken = getToken("access_token")
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

    // Refresh failed — session expired
    clearTokens()
    throw new ApiError(401, "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.")
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new ApiError(res.status, body.detail || "Request failed")
  }

  return res.json()
}

export async function uploadFile(file: File): Promise<string> {
  const token = getToken("access_token")
  const formData = new FormData()
  formData.append("file", file)

  const headers: Record<string, string> = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}/api/v1/uploads/court-image`, {
    method: "POST",
    headers,
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Upload failed" }))
    throw new ApiError(res.status, body.detail || "Upload failed")
  }

  const data = await res.json()
  return data.url
}

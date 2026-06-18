"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"

const DEFAULT_LIMIT = 15

/**
 * Fetch the admin-configured pagination limit from system settings.
 *
 * Falls back to DEFAULT_LIMIT if the setting doesn't exist or the
 * request fails (e.g. user is not an admin).
 */
export function usePaginationLimit(): number {
  const [limit, setLimit] = useState(DEFAULT_LIMIT)

  const fetchLimit = useCallback(async () => {
    try {
      const res = await api<{ value: string }>(
        "/api/v1/settings/pagination_limit"
      )
      const parsed = Number(res.value)
      if (!Number.isNaN(parsed) && parsed > 0) {
        setLimit(parsed)
      }
    } catch {
      // fall back to default
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchLimit(), 0)
    return () => clearTimeout(timer)
  }, [fetchLimit])

  return limit
}

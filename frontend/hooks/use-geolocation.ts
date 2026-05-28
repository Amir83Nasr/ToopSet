"use client"

import { useCallback, useEffect, useState } from "react"

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  error: string | null
  loading: boolean
  permissionState: PermissionState | "prompt"
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
    permissionState: "prompt",
  })

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setState((s) => ({
        ...s,
        error: "مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند",
        loading: false,
      }))
      return
    }

    setState((s) => ({ ...s, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
          permissionState: "granted",
        })
      },
      (err) => {
        let message = "خطا در دریافت موقعیت"
        if (err.code === err.PERMISSION_DENIED) {
          message = "دسترسی به موقعیت رد شد"
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = "موقعیت در دسترس نیست"
        } else if (err.code === err.TIMEOUT) {
          message = "دریافت موقعیت زمان‌بر شد"
        }
        setState((s) => ({
          ...s,
          error: message,
          loading: false,
          permissionState: "denied",
        }))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      },
    )
  }, [])

  useEffect(() => {
    // Check permission state first
    if (typeof window !== "undefined" && navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setState((s) => ({ ...s, permissionState: result.state as PermissionState }))
        if (result.state === "granted") {
          requestLocation()
        } else if (result.state === "denied") {
          setState((s) => ({
            ...s,
            loading: false,
            error: "دسترسی به موقعیت مجاز نیست. لطفاً از تنظیمات مرورگر مجوز دهید.",
          }))
        } else {
          setState((s) => ({ ...s, loading: false }))
        }
      })
    } else {
      requestLocation()
    }
  }, [requestLocation])

  return { ...state, requestLocation }
}

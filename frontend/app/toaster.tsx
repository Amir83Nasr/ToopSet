"use client"

import { Toaster as SonnerToaster } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"

export function Toaster() {
  const isMobile = useIsMobile()

  return (
    <SonnerToaster
      position="top-left"
      richColors
      closeButton={!isMobile}
      dir="rtl"
      visibleToasts={5}
      toastOptions={{
        style: {
          direction: "rtl",
          textAlign: "right",
          fontFamily: "IranYekanX, sans-serif",
          fontSize: "13px",
          padding: "14px 16px",
          gap: "8px",
        },
      }}
    />
  )
}

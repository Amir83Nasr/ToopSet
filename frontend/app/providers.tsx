"use client"

import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ErrorProvider } from "@/lib/error-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <ErrorProvider>{children}</ErrorProvider>
      <Toaster
        position="top-left"
        richColors
        closeButton
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
    </TooltipProvider>
  )
}

"use client"

import { Toaster } from "sonner"
import { DirectionProvider } from "@/components/ui/direction"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ErrorProvider } from "@/lib/error-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TooltipProvider>
        <DirectionProvider dir="rtl">
          <ErrorProvider>{children}</ErrorProvider>
        </DirectionProvider>
      </TooltipProvider>
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
    </>
  )
}

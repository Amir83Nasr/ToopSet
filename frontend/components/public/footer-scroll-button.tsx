"use client"

import { ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FooterScrollButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion ? "auto" : "smooth",
        })
      }}
      aria-label="بازگشت به بالا"
      className="text-xs text-muted-foreground hover:gap-2 hover:text-foreground"
    >
      <ArrowUp className="size-3.5" />
      بازگشت به بالا
    </Button>
  )
}

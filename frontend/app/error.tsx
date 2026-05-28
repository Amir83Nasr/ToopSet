"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  void error

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      dir="rtl"
    >
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="bg-noise pointer-events-none absolute inset-0 z-[1]" />
      <div className="page-entrance relative z-10 w-full max-w-md">
        <Card className="glass-card rounded-2xl border-border/40">
          <CardContent className="flex flex-col items-center py-16">
            <div className="mb-6 rounded-full bg-destructive/10 p-4 icon-glow">
              <AlertTriangle className="size-12 text-destructive" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">خطایی رخ داد</h2>
            <p className="mb-8 max-w-sm text-center text-sm text-muted-foreground">
              متأسفانه در پردازش درخواست شما خطایی رخ داده است. لطفاً مجدداً تلاش
              کنید.
            </p>
            <Button onClick={reset} variant="default" size="lg" className="shimmer-border">
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

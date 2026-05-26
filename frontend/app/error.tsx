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
    <div className="flex min-h-screen items-center justify-center p-4" dir="rtl">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center py-16">
          <div className="rounded-full bg-destructive/10 p-4 mb-6">
            <AlertTriangle className="size-12 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">خطایی رخ داد</h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm mb-8">
            متأسفانه در پردازش درخواست شما خطایی رخ داده است. لطفاً مجدداً تلاش کنید.
          </p>
          <Button onClick={reset} variant="default" size="lg">
            تلاش مجدد
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

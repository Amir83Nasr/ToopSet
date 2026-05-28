"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm text-center"
      >
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">خطایی رخ داد</h2>
        <p className="mb-8 text-sm text-muted-foreground">
          متأسفانه در پردازش درخواست شما خطایی رخ داده است. لطفاً مجدداً تلاش کنید.
        </p>
        <Button onClick={reset} variant="default" size="lg">
          تلاش مجدد
        </Button>
      </motion.div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Frown, RefreshCw } from "lucide-react"

export default function NotFound() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      dir="rtl"
    >
      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-muted">
          <Frown className="size-8 text-muted-foreground" />
        </div>
        <h1 className="mb-2 text-6xl font-bold text-primary">۴۰۴</h1>
        <h2 className="mb-2 text-xl font-semibold">صفحه مورد نظر یافت نشد</h2>
        <p className="mb-8 text-sm text-muted-foreground">
          صفحه‌ای که به دنبال آن هستید وجود ندارد یا حذف شده است.
        </p>
        <Button asChild>
          <Link href="/">
            <RefreshCw className="ml-1.5 size-4" />
            بازگشت به خانه
          </Link>
        </Button>
      </div>
    </div>
  )
}

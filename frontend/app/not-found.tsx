import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Frown } from "lucide-react"

export default function NotFound() {
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
            <div className="mb-6 rounded-full bg-muted p-4 icon-glow">
              <Frown className="size-12 text-muted-foreground" />
            </div>
            <h1 className="neon-sign mb-2 text-6xl font-bold text-primary">۴۰۴</h1>
            <h2 className="mb-2 text-xl font-semibold">صفحه مورد نظر یافت نشد</h2>
            <p className="mb-8 max-w-sm text-center text-sm text-muted-foreground">
              صفحه‌ای که به دنبال آن هستید وجود ندارد یا حذف شده است.
            </p>
            <Button asChild size="lg" className="shimmer-border">
              <Link href="/dashboard">بازگشت به خانه</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

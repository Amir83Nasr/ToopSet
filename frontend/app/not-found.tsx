import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Frown } from "lucide-react"

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center py-16">
          <div className="mb-6 rounded-full bg-muted p-4">
            <Frown className="size-12 text-muted-foreground" />
          </div>
          <h1 className="mb-2 text-6xl font-bold text-primary">۴۰۴</h1>
          <h2 className="mb-2 text-xl font-semibold">صفحه مورد نظر یافت نشد</h2>
          <p className="mb-8 max-w-sm text-center text-sm text-muted-foreground">
            صفحه‌ای که به دنبال آن هستید وجود ندارد یا حذف شده است.
          </p>
          <Button asChild size="lg">
            <Link href="/dashboard">بازگشت به خانه</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

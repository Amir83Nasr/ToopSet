import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Frown } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4" dir="rtl">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center py-16">
          <div className="rounded-full bg-muted p-4 mb-6">
            <Frown className="size-12 text-muted-foreground" />
          </div>
          <h1 className="text-6xl font-bold text-primary mb-2">۴۰۴</h1>
          <h2 className="text-xl font-semibold mb-2">صفحه مورد نظر یافت نشد</h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm mb-8">
            صفحه‌ای که به دنبال آن هستید وجود ندارد یا حذف شده است.
          </p>
          <Button asChild size="lg">
            <Link href="/dashboard">
              بازگشت به خانه
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

import { Card, CardContent } from "@/components/ui/card"
import { Wrench } from "lucide-react"

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          داشبورد مدیریت سیستم
        </h1>
        <p className="text-muted-foreground">نمای کلی و تحلیل عملکرد پلتفرم</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="mb-6 rounded-full bg-muted p-4">
            <Wrench className="size-12 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">در حال توسعه</h3>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            داشبورد مدیریت سیستم در حال بازطراحی است. به زودی آمارها، نمودارها و
            گزارشات جامع‌تری در این بخش در دسترس خواهد بود.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

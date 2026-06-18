import { Card, CardContent } from "@/components/ui/card"
import { Wrench } from "lucide-react"

export default function ManagerDashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          داشبورد مدیر مجموعه
        </h1>
        <p className="text-muted-foreground">
          مدیریت مجموعه‌ها، رزروها و درآمد
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="mb-6 rounded-full bg-muted p-4">
            <Wrench className="size-12 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">در حال توسعه</h3>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            داشبورد مدیر مجموعه در حال بازطراحی است. به زودی آمارها و گزارشات
            جامع‌تری از مجموعه‌ها و رزروهای شما در این بخش در دسترس خواهد بود.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

import { Card, CardContent } from "@/components/ui/card"
import { Wrench } from "lucide-react"

export default function UserDashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">داشبورد کاربر</h1>
        <p className="text-muted-foreground">
          رزروهای شما و مدیریت حساب کاربری
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="mb-6 rounded-full bg-muted p-4">
            <Wrench className="size-12 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">در حال توسعه</h3>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            داشبورد کاربری در حال بازطراحی است. به زودی اطلاعات جامع‌تری از
            رزروها، کیف پول و فعالیت‌های شما در این بخش نمایش داده خواهد شد.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

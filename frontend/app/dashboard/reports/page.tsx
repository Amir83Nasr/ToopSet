"use client"

import { Card, CardContent } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export default function ReportsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">گزارشات سیستم</h1>
        <p className="text-muted-foreground">تحلیل و گزارش عملکرد مجموعه‌ها</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 rounded-full bg-muted p-4">
            <BarChart3 className="size-10 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">در حال توسعه</h3>
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            بخش گزارشات سیستم در حال آماده‌سازی است. به زودی می‌توانید گزارشات
            جامعی از عملکرد مجموعه‌ها، درآمد و رزروها مشاهده کنید.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

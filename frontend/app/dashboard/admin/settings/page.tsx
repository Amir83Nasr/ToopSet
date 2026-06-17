"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Settings } from "lucide-react"

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">تنظیمات سیستم</h1>
        <p className="text-muted-foreground">
          مدیریت تنظیمات و پیکربندی پلتفرم
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Settings className="size-10 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">در حال توسعه</h3>
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            بخش تنظیمات سیستم در حال آماده‌سازی است. به زودی می‌توانید تنظیمات
            مربوط به مجموعه‌ها، تعرفه‌ها و پیکربندی پلتفرم را مدیریت کنید.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

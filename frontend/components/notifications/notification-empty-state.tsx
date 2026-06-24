import { Card, CardContent } from "@/components/ui/card"
import { Bell } from "lucide-react"

export function NotificationEmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="mb-4 rounded-full bg-muted p-4">
          <Bell className="size-10 text-muted-foreground" />
        </div>
        <h3 className="mb-1 text-lg font-semibold">هیچ اعلانی وجود ندارد</h3>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          اعلان‌های مربوط به رزروها و رویدادها در اینجا نمایش داده می‌شوند.
        </p>
      </CardContent>
    </Card>
  )
}

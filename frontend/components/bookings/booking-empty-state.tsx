import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarCheck } from "lucide-react"

interface BookingEmptyStateProps {
  /** True when there is an active search/filter producing no results */
  hasActiveFilters: boolean
}

export function BookingEmptyState({
  hasActiveFilters,
}: BookingEmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="mb-4 rounded-full bg-muted p-4">
          <CalendarCheck className="size-10 text-muted-foreground" />
        </div>
        <h3 className="mb-1 text-lg font-semibold">
          {hasActiveFilters ? "نتیجه‌ای یافت نشد" : "هنوز رزروی ندارید"}
        </h3>
        <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
          {hasActiveFilters
            ? "با فیلترهای انتخاب شده هیچ رزروی یافت نشد"
            : "مجموعه مورد علاقه خود را انتخاب کنید و رزرو نمایید."}
        </p>
        {!hasActiveFilters && (
          <Button asChild>
            <Link href="/dashboard/vendors">
              <CalendarCheck className="ml-2 size-4" />
              مشاهده مجموعه‌ها
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

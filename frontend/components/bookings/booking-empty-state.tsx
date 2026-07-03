import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarCheck } from "lucide-react"

interface BookingEmptyStateProps {
  /** True when there is an active search/filter producing no results */
  hasActiveFilters: boolean
  title?: string
  description?: string
  showAction?: boolean
}

export function BookingEmptyState({
  hasActiveFilters,
  title,
  description,
  showAction = true,
}: BookingEmptyStateProps) {
  const emptyTitle =
    title ?? (hasActiveFilters ? "نتیجه‌ای یافت نشد" : "هنوز رزروی ندارید")
  const emptyDescription =
    description ??
    (hasActiveFilters
      ? "با فیلترهای انتخاب شده هیچ رزروی یافت نشد"
      : "مجموعه مورد علاقه خود را انتخاب کنید و رزرو نمایید.")

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="mb-4 rounded-full bg-muted p-4">
          <CalendarCheck className="size-10 text-muted-foreground" />
        </div>
        <h3 className="mb-1 text-lg font-semibold">{emptyTitle}</h3>
        <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
          {emptyDescription}
        </p>
        {!hasActiveFilters && showAction && (
          <Button asChild>
            <Link href="/vendors">
              <CalendarCheck className="ml-2 size-4" />
              مشاهده مجموعه‌ها
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

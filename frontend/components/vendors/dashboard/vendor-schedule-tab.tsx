"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { TimeSlot } from "@/components/vendors/vendor-shared"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { toast } from "@/lib/toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { WeeklyGrid } from "@/components/dashboard/schedule/weekly-grid"
import { WeeklyScheduleEditor } from "@/components/dashboard/schedule/weekly-schedule-editor"
import { PERSIAN_DAY_NAMES } from "@/components/dashboard/schedule/utils"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Pencil,
  RefreshCw,
} from "lucide-react"

interface WeeklyScheduleItem {
  day_of_week: number
  start_time: string
  end_time: string
  base_price: number | string
  gender: "male" | "female"
}

interface WeeklyTemplateResponse {
  source: "saved_version" | "upcoming_week"
  version_id?: number
  effective_from?: string
  effective_until?: string
  minimum_effective_date: string
  last_online_booking_date?: string | null
  items: WeeklyScheduleItem[]
}

interface VendorScheduleTabProps {
  vendorId: number
  allSlots: TimeSlot[]
  weekStart: Date
  weekLabel: string
  canManage: boolean
  loading: boolean
  onPrevWeek: () => void
  onNextWeek: () => void
  onThisWeek: () => void
  onRefresh: () => void
}

function formatPrice(value: number | string): string {
  return `${Number(value).toLocaleString("fa-IR")} تومان`
}

export function VendorScheduleTab({
  vendorId,
  allSlots,
  weekStart,
  weekLabel,
  canManage,
  loading,
  onPrevWeek,
  onNextWeek,
  onThisWeek,
  onRefresh,
}: VendorScheduleTabProps) {
  const [showWeeklyEditor, setShowWeeklyEditor] = useState(false)
  const [template, setTemplate] = useState<WeeklyTemplateResponse | null>(null)
  const [templateLoading, setTemplateLoading] = useState(true)
  const [templateError, setTemplateError] = useState(false)

  const loadWeeklyTemplate = useCallback(async () => {
    setTemplateLoading(true)
    setTemplateError(false)
    try {
      const response = await api<WeeklyTemplateResponse>(
        `/api/v1/vendors/${vendorId}/slots/weekly-schedule-template`
      )
      setTemplate(response)
    } catch (error) {
      setTemplate(null)
      setTemplateError(true)
      toast.error(
        error instanceof ApiError ? error.message : "خطا در دریافت برنامه هفتگی"
      )
    } finally {
      setTemplateLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWeeklyTemplate(), 0)
    return () => window.clearTimeout(timer)
  }, [loadWeeklyTemplate])

  const itemsByDay = useMemo(() => {
    const groups = Array.from({ length: 7 }, () => [] as WeeklyScheduleItem[])
    for (const item of template?.items ?? []) {
      groups[item.day_of_week]?.push(item)
    }
    for (const items of groups) {
      items.sort((a, b) => a.start_time.localeCompare(b.start_time))
    }
    return groups
  }, [template])

  const refreshAll = useCallback(() => {
    onRefresh()
    void loadWeeklyTemplate()
  }, [loadWeeklyTemplate, onRefresh])

  return (
    <div className="space-y-6">
      {showWeeklyEditor ? (
        <WeeklyScheduleEditor
          vendorId={vendorId}
          embedded
          onCancel={() => setShowWeeklyEditor(false)}
          onApplied={() => {
            setShowWeeklyEditor(false)
            refreshAll()
          }}
        />
      ) : (
        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="border-b bg-primary/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <CardTitle
                  role="heading"
                  aria-level={2}
                  className="flex items-center gap-2"
                >
                  <CalendarDays className="size-5 shrink-0 text-primary" />
                  برنامه هفتگی ثابت سالن
                </CardTitle>
                <CardDescription>
                  برای هر روز، ساعت شروع و پایان، قیمت و سانس آقایان یا بانوان
                  را مشخص کنید.
                </CardDescription>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="بروزرسانی برنامه هفتگی"
                  onClick={refreshAll}
                >
                  <RefreshCw
                    className={`size-4 ${templateLoading ? "animate-spin" : ""}`}
                  />
                </Button>
                {canManage && (
                  <Button
                    className="min-w-0 flex-1 sm:flex-none"
                    onClick={() => setShowWeeklyEditor(true)}
                  >
                    <Pencil className="size-4 shrink-0 sm:me-1.5" />
                    ویرایش برنامه هفتگی
                  </Button>
                )}
              </div>
            </div>
            {!templateLoading && template && (
              <p className="text-xs text-muted-foreground">
                {template.source === "saved_version"
                  ? "نسخه فعال برنامه هفتگی"
                  : "برنامه استخراج‌شده از نزدیک‌ترین هفته کامل آینده"}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-4">
            {templateLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
                {PERSIAN_DAY_NAMES.map((day) => (
                  <Skeleton key={day} className="h-40 rounded-xl" />
                ))}
              </div>
            ) : templateError ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-muted-foreground">
                  دریافت برنامه هفتگی با خطا مواجه شد.
                </p>
                <Button variant="outline" onClick={loadWeeklyTemplate}>
                  تلاش دوباره
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
                {PERSIAN_DAY_NAMES.map((dayName, day) => (
                  <section
                    key={dayName}
                    className="min-h-40 rounded-xl border bg-muted/15 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between border-b pb-2">
                      <h3 className="font-semibold">{dayName}</h3>
                      <Badge variant="secondary">
                        {toPersianDigits(itemsByDay[day].length)} سانس
                      </Badge>
                    </div>
                    {itemsByDay[day].length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        سانسی تعیین نشده
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {itemsByDay[day].map((item, index) => (
                          <div
                            key={`${item.start_time}-${item.end_time}-${index}`}
                            className="space-y-2 rounded-lg border bg-card p-2.5 shadow-xs"
                          >
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <Clock className="size-3.5 text-primary" />
                              <span dir="ltr">
                                {item.start_time.slice(0, 5)} –{" "}
                                {item.end_time.slice(0, 5)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <DollarSign className="size-3.5" />
                              {formatPrice(item.base_price)}
                            </div>
                            <Badge
                              variant={
                                item.gender === "female"
                                  ? "outline"
                                  : "secondary"
                              }
                            >
                              {item.gender === "female" ? "بانوان" : "آقایان"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle role="heading" aria-level={2}>
                سانس‌های ایجادشده
              </CardTitle>
              <CardDescription>
                نتیجه برنامه هفتگی را در هفته‌های مختلف مشاهده کنید.
              </CardDescription>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button variant="outline" size="icon-sm" onClick={onPrevWeek}>
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={onThisWeek}
              >
                این هفته
              </Button>
              <Button variant="outline" size="icon-sm" onClick={onNextWeek}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={onRefresh}>
                <RefreshCw
                  className={`size-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
          <p className="text-sm font-medium">{weekLabel}</p>
        </CardHeader>
        <CardContent className="p-4">
          <WeeklyGrid slots={allSlots} weekStart={weekStart} readOnly />
        </CardContent>
      </Card>
    </div>
  )
}

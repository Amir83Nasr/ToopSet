"use client"

import { useMemo, useState } from "react"
import { toPersianDigits } from "@/lib/utils"
import type { TimeSlot } from "@/components/vendors/vendor-shared"
import type { DateRange } from "@daypicker/react"
import type { TimeSlotTemplate } from "@/components/dashboard/schedule/types"
import { api, ApiError } from "@/lib/api"
import { toLocalDateStr } from "@/lib/utils"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { WeeklyGrid } from "@/components/dashboard/schedule/weekly-grid"
import { BulkGenerator } from "@/components/dashboard/schedule/bulk-generator"
import { QuickSlotForm } from "@/components/dashboard/schedule/quick-slot-form"
import { WeeklyScheduleEditor } from "@/components/dashboard/schedule/weekly-schedule-editor"
import {
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Plus,
} from "lucide-react"

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
  const [showBulkGen, setShowBulkGen] = useState(false)
  const [showWeeklyEditor, setShowWeeklyEditor] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [quickSlotDate, setQuickSlotDate] = useState<Date | null>(null)
  const [quickSlotSubmitting, setQuickSlotSubmitting] = useState(false)

  const slotCountLabel = useMemo(() => {
    if (allSlots.length > 0) {
      return `${toPersianDigits(allSlots.length)} زمان ثبت شده`
    }
    return "این مجموعه هنوز زمانی ندارد"
  }, [allSlots.length])

  async function handleBulkGenerate(payload: {
    date_range: DateRange
    days: boolean[]
    templates: TimeSlotTemplate[]
  }) {
    const selectedDayIndices = payload.days
      .map((checked, i) => (checked ? i : -1))
      .filter((i) => i !== -1)

    if (selectedDayIndices.length === 0) {
      toast.error("حداقل یک روز هفته را انتخاب کنید")
      return
    }

    const validTemplates = payload.templates.filter(
      (t) => t.start_time && t.end_time && t.base_price
    )
    if (validTemplates.length === 0) {
      toast.error("حداقل یک بازه زمانی وارد کنید")
      return
    }

    if (!payload.date_range?.from || !payload.date_range?.to) {
      toast.error("بازه تاریخ را مشخص کنید")
      return
    }

    setGenerating(true)
    try {
      const res = await api<{
        created: number
        skipped: number
        total: number
      }>(`/api/v1/vendors/${vendorId}/slots/generate`, {
        method: "POST",
        body: JSON.stringify({
          date_from: toLocalDateStr(payload.date_range.from),
          date_to: toLocalDateStr(payload.date_range.to),
          days_of_week: selectedDayIndices,
          templates: validTemplates.map((t) => ({
            start_time: t.start_time,
            end_time: t.end_time,
            base_price: parseFloat(t.base_price),
          })),
        }),
      })
      if (res.created > 0) {
        toast.success(`${toPersianDigits(res.created)} زمان با موفقیت ایجاد شد`)
        if (res.skipped > 0) {
          toast.info(
            `${toPersianDigits(res.skipped)} زمان تکراری نادیده گرفته شد`
          )
        }
      } else {
        toast.info("زمان جدیدی ایجاد نشد (تکرار یا تداخل)")
      }
      setShowBulkGen(false)
      onRefresh()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ایجاد زمان‌ها"
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  async function handleQuickCreate(data: {
    start_time: string
    end_time: string
    base_price: number
  }) {
    if (!quickSlotDate) return
    setQuickSlotSubmitting(true)
    try {
      await api(`/api/v1/vendors/${vendorId}/slots`, {
        method: "POST",
        body: JSON.stringify({
          vendor_id: vendorId,
          start_time: `${toLocalDateStr(quickSlotDate)}T${data.start_time}:00`,
          end_time: `${toLocalDateStr(quickSlotDate)}T${data.end_time}:00`,
          base_price: data.base_price,
        }),
      })
      toast.success("سانس با موفقیت ایجاد شد")
      setQuickSlotDate(null)
      onRefresh()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ایجاد سانس"
      toast.error(msg)
    } finally {
      setQuickSlotSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={onPrevWeek}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onThisWeek}>
            این هفته
          </Button>
          <Button variant="outline" size="icon-sm" onClick={onNextWeek}>
            <ChevronLeft className="size-4" />
          </Button>
        </div>
        <div className="text-sm font-medium">{weekLabel}</div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkGen(true)}
              >
                <Plus className="ml-1 size-3.5" />
                ایجاد گروهی
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWeeklyEditor(true)}
              >
                <CalendarDays className="ml-1 size-3.5" />
                برنامه هفتگی
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={onRefresh}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Quick slot form */}
      {quickSlotDate && (
        <QuickSlotForm
          date={quickSlotDate}
          onClose={() => setQuickSlotDate(null)}
          onSubmit={handleQuickCreate}
          submitting={quickSlotSubmitting}
        />
      )}

      {/* Weekly grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            جدول هفتگی
            {allSlots.length > 0 && (
              <Badge variant="secondary">
                {toPersianDigits(allSlots.length)}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>{slotCountLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <WeeklyGrid
            slots={allSlots}
            weekStart={weekStart}
            onCellClick={(day) => setQuickSlotDate(day)}
            onAddSlot={(day) => setQuickSlotDate(day)}
          />
        </CardContent>
      </Card>

      {/* Bulk generator */}
      <BulkGenerator
        open={showBulkGen}
        onOpenChange={setShowBulkGen}
        onGenerate={handleBulkGenerate}
        generating={generating}
        currentSlots={allSlots}
      />

      <WeeklyScheduleEditor
        vendorId={vendorId}
        open={showWeeklyEditor}
        onOpenChange={setShowWeeklyEditor}
        onApplied={() => {
          setShowWeeklyEditor(false)
          onRefresh()
        }}
      />
    </div>
  )
}

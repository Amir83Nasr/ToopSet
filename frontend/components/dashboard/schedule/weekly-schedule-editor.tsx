"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { api, ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PersianInput } from "@/components/ui/persian-input"
import { TimePicker } from "@/components/ui/time-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PERSIAN_DAY_NAMES } from "./utils"

interface WeeklyItem {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  base_price: string
}

interface ApplyConflict {
  slot_id: number
  date: string
  booking_id?: number
  booking_source?: string
  reason: string
}

interface ApplyResult {
  effective_from: string
  effective_until: string
  created: number
  updated: number
  deleted: number
  unchanged: number
  preserved_reserved: number
  conflicts: ApplyConflict[]
}

interface WeeklyTemplateResponse {
  source: "saved_version" | "upcoming_week"
  version_id?: number
  effective_from?: string
  effective_until?: string
  items: Array<{
    day_of_week: number
    start_time: string
    end_time: string
    base_price: number
  }>
}

interface WeeklyScheduleEditorProps {
  vendorId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplied: () => void
}

function localDate(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function templateItems(response: WeeklyTemplateResponse): WeeklyItem[] {
  return response.items
    .map((item) => ({
      id: crypto.randomUUID(),
      day_of_week: item.day_of_week,
      start_time: item.start_time.slice(0, 5),
      end_time: item.end_time.slice(0, 5),
      base_price: String(item.base_price),
    }))
    .sort(
      (a, b) =>
        a.day_of_week - b.day_of_week ||
        a.start_time.localeCompare(b.start_time)
    )
}

function signature(item: WeeklyItem, withPrice = true): string {
  return `${item.day_of_week}-${item.start_time}-${item.end_time}${withPrice ? `-${Number(item.base_price)}` : ""}`
}

export function WeeklyScheduleEditor({
  vendorId,
  open,
  onOpenChange,
  onApplied,
}: WeeklyScheduleEditorProps) {
  const [baseline, setBaseline] = useState<WeeklyItem[]>([])
  const [items, setItems] = useState<WeeklyItem[]>([])
  const [templateSource, setTemplateSource] = useState<
    WeeklyTemplateResponse["source"] | null
  >(null)
  const minimumDate = useMemo(() => {
    const value = new Date()
    value.setDate(value.getDate() + 14)
    return localDate(value)
  }, [])
  const [effectiveFrom, setEffectiveFrom] = useState(minimumDate)
  const [duration, setDuration] = useState<"6" | "12">("6")
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [conflicts, setConflicts] = useState<ApplyConflict[]>([])

  const summary = useMemo(() => {
    const oldTimes = new Map(
      baseline.map((item) => [signature(item, false), item])
    )
    const newTimes = new Map(
      items.map((item) => [signature(item, false), item])
    )
    let added = 0
    let removed = 0
    let changed = 0
    for (const [key, item] of newTimes) {
      const previous = oldTimes.get(key)
      if (!previous) added++
      else if (signature(previous) !== signature(item)) changed++
    }
    for (const key of oldTimes.keys()) if (!newTimes.has(key)) removed++
    return { added, removed, changed }
  }, [baseline, items])

  async function loadTemplate() {
    setLoadingTemplate(true)
    setConflicts([])
    try {
      const response = await api<WeeklyTemplateResponse>(
        `/api/v1/vendors/${vendorId}/slots/weekly-schedule-template`
      )
      const loaded = templateItems(response)
      setBaseline(loaded)
      setItems(loaded)
      setTemplateSource(response.source)
    } catch (error) {
      setBaseline([])
      setItems([])
      setTemplateSource(null)
      toast.error(
        error instanceof ApiError ? error.message : "خطا در دریافت الگوی هفته"
      )
    } finally {
      setLoadingTemplate(false)
    }
  }

  function addItem(day: number) {
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        day_of_week: day,
        start_time: "10:00",
        end_time: "12:00",
        base_price: "",
      },
    ])
  }

  function updateItem(id: string, field: keyof WeeklyItem, value: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  function validate(): boolean {
    if (effectiveFrom < minimumDate) {
      toast.error("تاریخ شروع باید حداقل ۱۴ روز بعد از امروز باشد")
      return false
    }
    if (
      items.some(
        (item) => !item.start_time || !item.end_time || !Number(item.base_price)
      )
    ) {
      toast.error("اطلاعات همه سانس‌ها را کامل کنید")
      return false
    }
    for (let day = 0; day < 7; day++) {
      const dayItems = items
        .filter((item) => item.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
      for (let index = 0; index < dayItems.length; index++) {
        if (dayItems[index].start_time >= dayItems[index].end_time) {
          toast.error(
            `زمان شروع سانس ${PERSIAN_DAY_NAMES[day]} باید قبل از پایان باشد`
          )
          return false
        }
        if (
          index > 0 &&
          dayItems[index].start_time < dayItems[index - 1].end_time
        ) {
          toast.error(`سانس‌های ${PERSIAN_DAY_NAMES[day]} هم‌پوشانی دارند`)
          return false
        }
      }
    }
    return true
  }

  async function applySchedule() {
    if (!validate()) return
    setSubmitting(true)
    setConflicts([])
    try {
      const result = await api<ApplyResult>(
        `/api/v1/vendors/${vendorId}/slots/apply-weekly-schedule`,
        {
          method: "POST",
          body: JSON.stringify({
            effective_from: effectiveFrom,
            duration_months: Number(duration),
            items: items.map(
              ({ day_of_week, start_time, end_time, base_price }) => ({
                day_of_week,
                start_time,
                end_time,
                base_price: Number(base_price),
              })
            ),
          }),
        }
      )
      setConflicts(result.conflicts)
      toast.success(
        `${result.created.toLocaleString("fa-IR")} سانس ایجاد، ${result.updated.toLocaleString("fa-IR")} ویرایش و ${result.deleted.toLocaleString("fa-IR")} حذف شد`
      )
      if (result.preserved_reserved > 0) {
        toast.info(
          `${result.preserved_reserved.toLocaleString("fa-IR")} سانس رزروشده بدون تغییر حفظ شد`
        )
      }
      setConfirming(false)
      onApplied()
    } catch (error) {
      if (error instanceof ApiError) {
        const detail = error.details as
          | { conflicts?: ApplyConflict[] }
          | undefined
        setConflicts(detail?.conflicts ?? [])
        toast.error(error.message)
      } else toast.error("خطا در اعمال برنامه هفتگی")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          onOpenChange(value)
          if (value) void loadTemplate()
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>ویرایش برنامه هفتگی سالن</DialogTitle>
            <DialogDescription>
              این الگو از تاریخ انتخابی به بعد اعمال می‌شود؛ تقویم دو هفته آینده
              تغییر نمی‌کند.
            </DialogDescription>
          </DialogHeader>

          {loadingTemplate && (
            <div className="flex items-center justify-center gap-2 rounded-lg border p-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" /> در حال دریافت برنامه
              هفته...
            </div>
          )}
          {!loadingTemplate && templateSource && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              {templateSource === "saved_version"
                ? "مبنای ویرایش: آخرین نسخه ذخیره‌شده برنامه هفتگی"
                : "مبنای اولیه: نزدیک‌ترین هفته کامل آینده؛ پس از ذخیره، نسخه مستقل برنامه نگهداری می‌شود"}
            </p>
          )}
          <div
            className={`grid gap-3 md:grid-cols-7 ${loadingTemplate ? "pointer-events-none opacity-50" : ""}`}
          >
            {PERSIAN_DAY_NAMES.map((dayName, day) => (
              <div
                key={dayName}
                className="space-y-2 rounded-lg border bg-muted/20 p-2"
              >
                <div className="flex items-center justify-between">
                  <Label>{dayName}</Label>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="outline"
                    onClick={() => addItem(day)}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
                {items
                  .filter((item) => item.day_of_week === day)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="space-y-2 rounded-md border bg-card p-2"
                    >
                      <TimePicker
                        value={item.start_time}
                        onChange={(value) =>
                          updateItem(item.id, "start_time", value)
                        }
                      />
                      <TimePicker
                        value={item.end_time}
                        onChange={(value) =>
                          updateItem(item.id, "end_time", value)
                        }
                      />
                      <PersianInput
                        value={item.base_price}
                        onChange={(event) =>
                          updateItem(item.id, "base_price", event.target.value)
                        }
                        placeholder="قیمت"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          setItems((current) =>
                            current.filter((row) => row.id !== item.id)
                          )
                        }
                      >
                        <Trash2 className="ml-1 size-3.5" /> حذف
                      </Button>
                    </div>
                  ))}
              </div>
            ))}
          </div>

          <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="schedule-effective-date">شروع اعمال برنامه</Label>
              <Input
                id="schedule-effective-date"
                type="date"
                min={minimumDate}
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                زودترین تاریخ:{" "}
                {new Date(`${minimumDate}T12:00:00`).toLocaleDateString(
                  "fa-IR"
                )}
              </p>
            </div>
            <div className="space-y-2">
              <Label>مدت ایجاد تقویم</Label>
              <Select
                value={duration}
                onValueChange={(value) => setDuration(value as "6" | "12")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">۶ ماه</SelectItem>
                  <SelectItem value="12">۱ سال</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md bg-muted p-3 text-sm">
              <div>سانس جدید: {summary.added.toLocaleString("fa-IR")}</div>
              <div>تغییر قیمت: {summary.changed.toLocaleString("fa-IR")}</div>
              <div>حذف از الگو: {summary.removed.toLocaleString("fa-IR")}</div>
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <p className="font-medium text-destructive">تداخل‌های رزرو</p>
              {conflicts.slice(0, 20).map((conflict) => (
                <div
                  key={`${conflict.slot_id}-${conflict.reason}`}
                  className="text-xs"
                >
                  {new Date(`${conflict.date}T12:00:00`).toLocaleDateString(
                    "fa-IR"
                  )}
                  : {conflict.reason}
                  {conflict.booking_id
                    ? ` (رزرو ${conflict.booking_id.toLocaleString("fa-IR")})`
                    : ""}
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button
              disabled={loadingTemplate}
              onClick={() => validate() && setConfirming(true)}
            >
              <Save className="ml-1 size-4" /> مشاهده خلاصه و تأیید
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأیید اعمال برنامه هفتگی</DialogTitle>
            <DialogDescription>
              برنامه از{" "}
              {new Date(`${effectiveFrom}T12:00:00`).toLocaleDateString(
                "fa-IR"
              )}{" "}
              برای {duration === "6" ? "۶ ماه" : "۱ سال"} اعمال می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border p-3 text-sm">
            <p>افزودن {summary.added.toLocaleString("fa-IR")} الگوی سانس</p>
            <p>
              تغییر قیمت {summary.changed.toLocaleString("fa-IR")} الگوی سانس
            </p>
            <p>حذف {summary.removed.toLocaleString("fa-IR")} الگوی سانس</p>
            <p className="text-muted-foreground">
              سانس‌های رزروشده حذف یا جابه‌جا نمی‌شوند.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              بازگشت
            </Button>
            <Button onClick={applySchedule} disabled={submitting}>
              {submitting ? (
                <Loader2 className="ml-1 size-4 animate-spin" />
              ) : (
                <CalendarDays className="ml-1 size-4" />
              )}
              اعمال برنامه
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

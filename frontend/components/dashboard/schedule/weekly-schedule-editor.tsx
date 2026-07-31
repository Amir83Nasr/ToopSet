"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react"
import { api, ApiError } from "@/lib/api"
import { toEnglishDigits } from "@/lib/utils"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PersianDatePicker } from "@/components/ui/persian-date-picker"
import { PersianInput } from "@/components/ui/persian-input"
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
  gender: "male" | "female"
}

interface NewSlotDraft {
  day: number
  start_time: string
  end_time: string
  base_price: string
  gender: "male" | "female"
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
  deleted_manager_reservations: number
  conflicts: ApplyConflict[]
}

interface ApplyErrorDetails {
  code?: string
  conflicts?: ApplyConflict[]
  manager_booking_count?: number
  minimum_date?: string
  last_online_booking_date?: string | null
}

interface WeeklyTemplateResponse {
  source: "saved_version" | "upcoming_week"
  version_id?: number
  effective_from?: string
  effective_until?: string
  minimum_effective_date: string
  last_online_booking_date?: string | null
  items: Array<{
    day_of_week: number
    start_time: string
    end_time: string
    base_price: number | string
    gender: "male" | "female"
  }>
}

interface WeeklyScheduleEditorProps {
  vendorId: number
  open?: boolean
  embedded?: boolean
  onOpenChange?: (open: boolean) => void
  onCancel?: () => void
  onApplied: () => void
}

function localDate(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day, 12)
}

function templateItems(response: WeeklyTemplateResponse): WeeklyItem[] {
  return response.items
    .map((item) => ({
      id: crypto.randomUUID(),
      day_of_week: item.day_of_week,
      start_time: item.start_time.slice(0, 5),
      end_time: item.end_time.slice(0, 5),
      base_price: String(Math.trunc(Number(item.base_price))),
      gender: item.gender ?? "male",
    }))
    .sort(
      (a, b) =>
        a.day_of_week - b.day_of_week ||
        a.start_time.localeCompare(b.start_time)
    )
}

function signature(item: WeeklyItem, withPrice = true): string {
  return `${item.day_of_week}-${item.start_time}-${item.end_time}${withPrice ? `-${Number(item.base_price)}-${item.gender}` : ""}`
}

const DURATION_LABELS = {
  "1": "۱ ماه",
  "3": "۳ ماه",
  "6": "۶ ماه",
  "12": "۱ سال",
} as const

type Duration = keyof typeof DURATION_LABELS
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

function sortWeeklyItems(items: WeeklyItem[]): WeeklyItem[] {
  return [...items].sort(
    (a, b) =>
      a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
  )
}

interface KeyboardTimeInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  autoFocus?: boolean
}

function KeyboardTimeInput({
  id,
  value,
  onChange,
  ariaLabel,
  autoFocus,
}: KeyboardTimeInputProps) {
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      dir="ltr"
      maxLength={5}
      placeholder="HH:MM"
      value={value}
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      className="text-center font-mono tabular-nums"
      onChange={(event) => {
        const digits = toEnglishDigits(event.target.value)
          .replace(/\D/g, "")
          .slice(0, 4)
        onChange(
          digits.length > 2
            ? `${digits.slice(0, 2)}:${digits.slice(2)}`
            : digits
        )
      }}
    />
  )
}

interface ScheduleEditorContainerProps {
  children: ReactNode
  embedded: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ScheduleEditorContainer({
  children,
  embedded,
  open,
  onOpenChange,
}: ScheduleEditorContainerProps) {
  const title = embedded
    ? "ویرایش برنامه هفتگی ثابت سالن"
    : "ویرایش برنامه هفتگی سالن"
  const description =
    "این الگو پس از آخرین رزرو کاربر عادی اعمال می‌شود و رزروهای آنلاین موجود را تغییر نمی‌دهد."

  if (embedded) {
    return (
      <Card className="overflow-hidden border-primary/30">
        <CardHeader className="border-b bg-primary/5">
          <CardTitle role="heading" aria-level={2}>
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4">{children}</CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function WeeklyScheduleEditor({
  vendorId,
  open = false,
  embedded = false,
  onOpenChange,
  onCancel,
  onApplied,
}: WeeklyScheduleEditorProps) {
  const [baseline, setBaseline] = useState<WeeklyItem[]>([])
  const [items, setItems] = useState<WeeklyItem[]>([])
  const [templateSource, setTemplateSource] = useState<
    WeeklyTemplateResponse["source"] | null
  >(null)
  const minimumDate = useMemo(() => {
    const value = new Date()
    value.setDate(value.getDate() + 1)
    return localDate(value)
  }, [])
  const [dynamicMinimumDate, setDynamicMinimumDate] = useState(minimumDate)
  const [lastOnlineBookingDate, setLastOnlineBookingDate] = useState<
    string | null
  >(null)
  const [effectiveFrom, setEffectiveFrom] = useState(minimumDate)
  const effectiveFromDate = useMemo(
    () => parseLocalDate(effectiveFrom),
    [effectiveFrom]
  )
  const minimumDateValue = useMemo(
    () => parseLocalDate(dynamicMinimumDate),
    [dynamicMinimumDate]
  )
  const [duration, setDuration] = useState<Duration>("6")
  const [confirming, setConfirming] = useState(false)
  const [confirmingManagerDeletion, setConfirmingManagerDeletion] =
    useState(false)
  const [managerBookingCount, setManagerBookingCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [conflicts, setConflicts] = useState<ApplyConflict[]>([])
  const [newSlot, setNewSlot] = useState<NewSlotDraft | null>(null)

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

  const loadTemplate = useCallback(async () => {
    setLoadingTemplate(true)
    setConflicts([])
    try {
      const response = await api<WeeklyTemplateResponse>(
        `/api/v1/vendors/${vendorId}/slots/weekly-schedule-template`
      )
      const loaded = templateItems(response)
      const nextMinimumDate = response.minimum_effective_date ?? minimumDate
      setBaseline(loaded)
      setItems(loaded)
      setTemplateSource(response.source)
      setDynamicMinimumDate(nextMinimumDate)
      setLastOnlineBookingDate(response.last_online_booking_date ?? null)
      setEffectiveFrom((current) =>
        current < nextMinimumDate ? nextMinimumDate : current
      )
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
  }, [minimumDate, vendorId])

  useEffect(() => {
    if (!open && !embedded) return
    const timer = window.setTimeout(() => void loadTemplate(), 0)
    return () => window.clearTimeout(timer)
  }, [embedded, loadTemplate, open])

  function openNewSlot(day: number) {
    setNewSlot({
      day,
      start_time: "",
      end_time: "",
      base_price: "",
      gender: "male",
    })
  }

  function addNewSlot() {
    if (!newSlot) return
    if (
      !TIME_PATTERN.test(newSlot.start_time) ||
      !TIME_PATTERN.test(newSlot.end_time)
    ) {
      toast.error("ساعت شروع و پایان را با فرمت صحیح وارد کنید")
      return
    }
    if (newSlot.start_time >= newSlot.end_time) {
      toast.error("ساعت شروع باید قبل از ساعت پایان باشد")
      return
    }
    if (!Number(newSlot.base_price)) {
      toast.error("قیمت سانس را وارد کنید")
      return
    }
    const overlaps = items.some(
      (item) =>
        item.day_of_week === newSlot.day &&
        newSlot.start_time < item.end_time &&
        newSlot.end_time > item.start_time
    )
    if (overlaps) {
      toast.error(
        `این بازه با یکی از سانس‌های ${PERSIAN_DAY_NAMES[newSlot.day]} هم‌پوشانی دارد`
      )
      return
    }
    setItems((current) =>
      sortWeeklyItems([
        ...current,
        {
          id: crypto.randomUUID(),
          day_of_week: newSlot.day,
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          base_price: newSlot.base_price,
          gender: newSlot.gender,
        },
      ])
    )
    setNewSlot(null)
  }

  function updateItem(id: string, field: keyof WeeklyItem, value: string) {
    setItems((current) =>
      sortWeeklyItems(
        current.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        )
      )
    )
  }

  function validate(): boolean {
    if (effectiveFrom < dynamicMinimumDate) {
      toast.error("تاریخ شروع باید بعد از آخرین رزرو کاربر عادی باشد")
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

  async function applySchedule(confirmManagerBookingDeletions = false) {
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
            confirm_manager_booking_deletions: confirmManagerBookingDeletions,
            items: items.map(
              ({ day_of_week, start_time, end_time, base_price, gender }) => ({
                day_of_week,
                start_time,
                end_time,
                base_price: Number(base_price),
                gender,
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
      if (result.deleted_manager_reservations > 0) {
        toast.info(
          `${result.deleted_manager_reservations.toLocaleString("fa-IR")} رزرو دستی سالن‌دار حذف شد`
        )
      }
      setConfirming(false)
      setConfirmingManagerDeletion(false)
      onApplied()
    } catch (error) {
      if (error instanceof ApiError) {
        const detail = error.details as ApplyErrorDetails | undefined
        if (detail?.minimum_date) {
          setDynamicMinimumDate(detail.minimum_date)
          setLastOnlineBookingDate(detail.last_online_booking_date ?? null)
          setEffectiveFrom(detail.minimum_date)
        }
        setConflicts(detail?.conflicts ?? [])
        setConfirming(false)
        if (detail?.code === "manager_booking_deletion_confirmation_required") {
          setManagerBookingCount(
            detail.manager_booking_count ?? detail.conflicts?.length ?? 0
          )
          setConfirmingManagerDeletion(true)
          toast.warning(error.message)
        } else {
          setConfirmingManagerDeletion(false)
          toast.error(error.message)
        }
      } else toast.error("خطا در اعمال برنامه هفتگی")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <ScheduleEditorContainer
        embedded={embedded}
        open={open}
        onOpenChange={(value) => {
          onOpenChange?.(value)
          if (!value) {
            setConfirming(false)
            setConfirmingManagerDeletion(false)
          }
        }}
      >
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
                  aria-label={`افزودن سانس ${dayName}`}
                  onClick={() => openNewSlot(day)}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
              {items
                .filter((item) => item.day_of_week === day)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((item) => (
                  <div
                    key={item.id}
                    className="space-y-2 rounded-md border bg-card p-2"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">شروع</Label>
                      <KeyboardTimeInput
                        value={item.start_time}
                        ariaLabel={`ساعت شروع سانس ${dayName}`}
                        onChange={(value) =>
                          updateItem(item.id, "start_time", value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">پایان</Label>
                      <KeyboardTimeInput
                        value={item.end_time}
                        ariaLabel={`ساعت پایان سانس ${dayName}`}
                        onChange={(value) =>
                          updateItem(item.id, "end_time", value)
                        }
                      />
                    </div>
                    <PersianInput
                      value={item.base_price}
                      formatThousands
                      onChange={(event) =>
                        updateItem(item.id, "base_price", event.target.value)
                      }
                      placeholder="قیمت"
                    />
                    <Select
                      value={item.gender}
                      onValueChange={(value) =>
                        updateItem(item.id, "gender", value)
                      }
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-label={`جنسیت سانس ${dayName}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">آقایان</SelectItem>
                        <SelectItem value="female">بانوان</SelectItem>
                      </SelectContent>
                    </Select>
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
            <Label>شروع اعمال برنامه</Label>
            <PersianDatePicker
              value={effectiveFromDate}
              minDate={minimumDateValue}
              onChange={(date) => setEffectiveFrom(localDate(date))}
            />
            <p className="text-xs text-muted-foreground">
              {lastOnlineBookingDate
                ? `آخرین رزرو کاربر عادی: ${parseLocalDate(lastOnlineBookingDate).toLocaleDateString("fa-IR-u-ca-persian")} — شروع مجاز از `
                : "رزرو آنلاین آینده‌ای وجود ندارد — شروع مجاز از "}
              {minimumDateValue.toLocaleDateString("fa-IR-u-ca-persian")}
            </p>
          </div>
          <div className="space-y-2">
            <Label>مدت ایجاد تقویم</Label>
            <Select
              value={duration}
              onValueChange={(value) => setDuration(value as Duration)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">۱ ماه</SelectItem>
                <SelectItem value="3">۳ ماه</SelectItem>
                <SelectItem value="6">۶ ماه</SelectItem>
                <SelectItem value="12">۱ سال</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            <div>سانس جدید: {summary.added.toLocaleString("fa-IR")}</div>
            <div>
              تغییر قیمت/جنسیت: {summary.changed.toLocaleString("fa-IR")}
            </div>
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
          <Button
            variant="outline"
            onClick={() => (embedded ? onCancel?.() : onOpenChange?.(false))}
          >
            {embedded ? "انصراف از ویرایش" : "انصراف"}
          </Button>
          <Button
            disabled={loadingTemplate}
            onClick={() => validate() && setConfirming(true)}
          >
            <Save className="ml-1 size-4" /> مشاهده خلاصه و تأیید
          </Button>
        </DialogFooter>
      </ScheduleEditorContainer>

      <Dialog
        open={newSlot !== null}
        onOpenChange={(value) => !value && setNewSlot(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock className="size-5" />
            </div>
            <DialogTitle className="text-center">
              افزودن سانس {newSlot ? PERSIAN_DAY_NAMES[newSlot.day] : ""}
            </DialogTitle>
            <DialogDescription className="text-center">
              ساعت‌ها را در قالب ۲۴ ساعته وارد کنید؛ برای مثال ۱۸:۳۰.
            </DialogDescription>
          </DialogHeader>
          {newSlot && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="new-slot-start">ساعت شروع</Label>
                  <KeyboardTimeInput
                    id="new-slot-start"
                    autoFocus
                    value={newSlot.start_time}
                    onChange={(value) =>
                      setNewSlot((current) =>
                        current ? { ...current, start_time: value } : null
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-slot-end">ساعت پایان</Label>
                  <KeyboardTimeInput
                    id="new-slot-end"
                    value={newSlot.end_time}
                    onChange={(value) =>
                      setNewSlot((current) =>
                        current ? { ...current, end_time: value } : null
                      )
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-slot-price">قیمت سانس</Label>
                <PersianInput
                  id="new-slot-price"
                  value={newSlot.base_price}
                  formatThousands
                  placeholder="مثلاً ۵۰۰٬۰۰۰"
                  onChange={(event) =>
                    setNewSlot((current) =>
                      current
                        ? { ...current, base_price: event.target.value }
                        : null
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>نوع سانس</Label>
                <Select
                  value={newSlot.gender}
                  onValueChange={(value: "male" | "female") =>
                    setNewSlot((current) =>
                      current ? { ...current, gender: value } : null
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">آقایان</SelectItem>
                    <SelectItem value="female">بانوان</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSlot(null)}>
              انصراف
            </Button>
            <Button onClick={addNewSlot}>
              <Plus className="ml-1 size-4" /> افزودن سانس
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
              برای {DURATION_LABELS[duration]} اعمال می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border p-3 text-sm">
            <p>افزودن {summary.added.toLocaleString("fa-IR")} الگوی سانس</p>
            <p>
              تغییر قیمت/جنسیت {summary.changed.toLocaleString("fa-IR")} الگوی
              سانس
            </p>
            <p>حذف {summary.removed.toLocaleString("fa-IR")} الگوی سانس</p>
            <p className="text-muted-foreground">
              رزرو کاربران عادی همیشه حفظ می‌شود. اگر تغییر ساعت به رزروهای دستی
              سالن‌دار برخورد کند، پیش از حذف تأیید جداگانه گرفته می‌شود.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              بازگشت
            </Button>
            <Button onClick={() => void applySchedule()} disabled={submitting}>
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

      <Dialog
        open={confirmingManagerDeletion}
        onOpenChange={setConfirmingManagerDeletion}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" /> حذف رزروهای دستی سالن‌دار
            </DialogTitle>
            <DialogDescription>
              تغییر بازه‌های زمانی باعث حذف دائمی
              <strong className="px-1 text-foreground">
                {managerBookingCount.toLocaleString("fa-IR")}
              </strong>
              رزرو دستی سالن‌دار می‌شود. این رزروها پرداخت آنلاین ندارند و
              بازپرداختی انجام نمی‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            {conflicts.map((conflict) => (
              <p key={conflict.slot_id} className="text-xs">
                {new Date(`${conflict.date}T12:00:00`).toLocaleDateString(
                  "fa-IR"
                )}
                — {conflict.reason}
              </p>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmingManagerDeletion(false)}
            >
              انصراف و بازگشت
            </Button>
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={() => void applySchedule(true)}
            >
              {submitting && <Loader2 className="ml-1 size-4 animate-spin" />}
              تأیید حذف و اعمال برنامه
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

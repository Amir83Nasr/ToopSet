"use client"

import { useState, useMemo, useEffect } from "react"
import { Plus, X, Save, Copy, Trash2, Clock, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { TimePicker } from "@/components/ui/time-picker"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { PersianInput } from "@/components/ui/persian-input"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  calculatePreviewCount,
  getThisWeekRange,
  getNextWeekRange,
  getThirtyDayRange,
  PERSIAN_DAY_NAMES,
  extractTemplateFromSlots,
} from "./utils"
import type { TimeSlotTemplate, ScheduleTemplate, TimeSlot } from "./types"
import type { DateRange } from "@daypicker/react"

interface BulkGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (payload: {
    date_range: DateRange
    days: boolean[]
    templates: TimeSlotTemplate[]
  }) => void
  generating: boolean
  currentSlots?: TimeSlot[]
}

const TEMPLATES_KEY = "toopset-schedule-templates"

function loadTemplates(): ScheduleTemplate[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTemplates(templates: ScheduleTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
}

export function BulkGenerator({
  open,
  onOpenChange,
  onGenerate,
  generating,
  currentSlots,
}: BulkGeneratorProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    getThisWeekRange()
  )
  const [selectedDays, setSelectedDays] = useState<boolean[]>(
    Array.from({ length: 7 }, () => true)
  )
  const [templates, setTemplates] = useState<TimeSlotTemplate[]>([
    {
      start_time: "08:00",
      end_time: "10:00",
      base_price: "",
      ball_price: "",
      ball_available: false,
    },
  ])
  const [savedTemplates, setSavedTemplates] = useState<ScheduleTemplate[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [templateName, setTemplateName] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setSavedTemplates(loadTemplates()), 0)
    return () => clearTimeout(timer)
  }, [open])

  const previewCount = useMemo(
    () => calculatePreviewCount(selectedDays, dateRange, templates),
    [selectedDays, dateRange, templates]
  )

  function addTemplate() {
    setTemplates((prev) => [
      ...prev,
      {
        start_time: "",
        end_time: "",
        base_price: "",
        ball_price: "",
        ball_available: false,
      },
    ])
  }

  function removeTemplate(index: number) {
    setTemplates((prev) => prev.filter((_, i) => i !== index))
  }

  function updateTemplate(
    index: number,
    field: keyof TimeSlotTemplate,
    value: string | boolean
  ) {
    setTemplates((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function handleSaveTemplate() {
    if (!templateName.trim()) return
    const newTemplate: ScheduleTemplate = {
      id: crypto.randomUUID(),
      name: templateName.trim(),
      days: selectedDays,
      templates: templates.filter(
        (t) => t.start_time && t.end_time && t.base_price
      ),
      createdAt: new Date().toISOString(),
    }
    const updated = [...savedTemplates, newTemplate]
    setSavedTemplates(updated)
    saveTemplates(updated)
    setTemplateName("")
    setShowSaveDialog(false)
  }

  function handleApplyTemplate(tpl: ScheduleTemplate) {
    setSelectedDays([...tpl.days])
    setTemplates(
      tpl.templates.map((t) => ({
        ...t,
        ball_price: t.ball_price ?? "",
        ball_available: t.ball_available ?? false,
      }))
    )
  }

  function handleDeleteTemplate(id: string) {
    const updated = savedTemplates.filter((t) => t.id !== id)
    setSavedTemplates(updated)
    saveTemplates(updated)
  }

  function handleCopyWeek() {
    if (!currentSlots || currentSlots.length === 0) return
    const extracted = extractTemplateFromSlots(currentSlots)
    setSelectedDays(extracted.days)
    setTemplates(
      extracted.templates.length > 0
        ? extracted.templates
        : [
            {
              start_time: "",
              end_time: "",
              base_price: "",
              ball_price: "",
              ball_available: false,
            },
          ]
    )
  }

  function handleSubmit() {
    if (!dateRange) return
    onGenerate({ date_range: dateRange, days: selectedDays, templates })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="w-full max-w-md overflow-y-auto sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle>ایجاد زمان‌بندی گروهی</SheetTitle>
            <SheetDescription>
              بازه تاریخ، روزهای هفته و بازه‌های زمانی را مشخص کنید
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Date range */}
            <div className="space-y-2">
              <Label>بازه تاریخ (شمسی)</Label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="انتخاب بازه تاریخ"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange(getThisWeekRange())}
                >
                  این هفته
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange(getNextWeekRange())}
                >
                  هفته آینده
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange(getThirtyDayRange())}
                >
                  ۳۰ روز آینده
                </Button>
              </div>
            </div>

            {/* Days of week */}
            <div className="space-y-2">
              <Label>روزهای هفته</Label>
              <div className="flex flex-wrap gap-2">
                {PERSIAN_DAY_NAMES.map((name, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={selectedDays[index] ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const next = [...selectedDays]
                      next[index] = !next[index]
                      setSelectedDays(next)
                    }}
                    className="rounded-full"
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Time templates */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>بازه‌های زمانی</Label>
                <div className="flex gap-1">
                  {currentSlots && currentSlots.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyWeek}
                      title="استخراج از برنامه فعلی"
                    >
                      <Copy className="ml-1 size-3.5" />
                      کپی از هفته جاری
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTemplate}
                  >
                    <Plus className="ml-1 size-3.5" />
                    افزودن بازه
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {templates.map((tpl, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-end gap-2 rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">شروع</Label>
                      <TimePicker
                        value={tpl.start_time}
                        onChange={(val) =>
                          updateTemplate(index, "start_time", val)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">پایان</Label>
                      <TimePicker
                        value={tpl.end_time}
                        onChange={(val) =>
                          updateTemplate(index, "end_time", val)
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">قیمت (تومان)</Label>
                      <PersianInput
                        value={tpl.base_price}
                        onChange={(e) =>
                          updateTemplate(index, "base_price", e.target.value)
                        }
                        placeholder="۵۰۰۰۰۰"
                        className="w-full"
                      />
                    </div>
                    <div className="min-w-36 space-y-1">
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={tpl.ball_available}
                          onCheckedChange={(checked) =>
                            updateTemplate(
                              index,
                              "ball_available",
                              checked === true
                            )
                          }
                        />
                        رزرو توپ
                      </label>
                      <PersianInput
                        value={tpl.ball_price}
                        onChange={(e) =>
                          updateTemplate(index, "ball_price", e.target.value)
                        }
                        placeholder="قیمت توپ"
                        disabled={!tpl.ball_available}
                        className="w-full"
                      />
                    </div>
                    {templates.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => removeTemplate(index)}
                      >
                        <X className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Saved templates */}
            {savedTemplates.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>تمپلیت‌های ذخیره شده</Label>
                  <div className="space-y-2">
                    {savedTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="flex items-center justify-between rounded-lg border p-2.5"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Tag className="size-3.5 text-primary" />
                            {tpl.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tpl.templates.length} بازه &middot;{" "}
                            {tpl.days.filter(Boolean).length} روز
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApplyTemplate(tpl)}
                          >
                            <Save className="ml-1 size-3.5" />
                            اعمال
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTemplate(tpl.id)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <SheetFooter className="mt-6 border-t pt-4">
            <div className="flex w-full flex-col gap-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  <span>
                    <strong className="text-foreground">
                      {previewCount.toLocaleString("fa-IR")}
                    </strong>{" "}
                    زمان آماده ایجاد
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                  disabled={previewCount === 0}
                >
                  <Save className="ml-1 size-3.5" />
                  ذخیره تمپلیت
                </Button>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={generating || previewCount === 0}
                className="w-full"
              >
                {generating ? "در حال ایجاد..." : "ایجاد زمان‌ها"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Save template dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ذخیره تمپلیت</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>نام تمپلیت</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="مثلاً: برنامه تابستونی"
              className="mt-1.5"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTemplate()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              انصراف
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim()}
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

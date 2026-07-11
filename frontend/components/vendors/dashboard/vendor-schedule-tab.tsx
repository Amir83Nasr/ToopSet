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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PersianInput } from "@/components/ui/persian-input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { WeeklyGrid } from "@/components/dashboard/schedule/weekly-grid"
import { BulkGenerator } from "@/components/dashboard/schedule/bulk-generator"
import { QuickSlotForm } from "@/components/dashboard/schedule/quick-slot-form"
import {
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Trash2,
  Plus,
  Loader2,
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
  const [generating, setGenerating] = useState(false)
  const [slotToDelete, setSlotToDelete] = useState<TimeSlot | null>(null)
  const [quickSlotDate, setQuickSlotDate] = useState<Date | null>(null)
  const [quickSlotSubmitting, setQuickSlotSubmitting] = useState(false)

  // Slot edit state
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null)
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editBallAvailable, setEditBallAvailable] = useState(false)
  const [editBallPrice, setEditBallPrice] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  const slotCountLabel = useMemo(() => {
    if (allSlots.length > 0) {
      return `${toPersianDigits(allSlots.length)} زمان ثبت شده`
    }
    return "این مجموعه هنوز زمانی ندارد"
  }, [allSlots.length])

  function handleEditSlot(slot: TimeSlot) {
    setEditingSlot(slot)
    const start = slot.start_time.split("T")[1]?.slice(0, 5) || ""
    const end = slot.end_time.split("T")[1]?.slice(0, 5) || ""
    setEditStartTime(start)
    setEditEndTime(end)
    setEditPrice(String(slot.base_price))
    setEditBallAvailable(slot.ball_available)
    setEditBallPrice(String(slot.ball_price || ""))
  }

  async function handleSaveEdit() {
    if (!editingSlot) return
    setEditLoading(true)
    try {
      await api(`/api/v1/vendors/${vendorId}/slots/${editingSlot.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          start_time: editStartTime,
          end_time: editEndTime,
          base_price: parseFloat(editPrice),
          ball_available: editBallAvailable,
          ball_price: editBallAvailable ? parseFloat(editBallPrice || "0") : 0,
        }),
      })
      toast.success("سانس با موفقیت ویرایش شد")
      setEditingSlot(null)
      onRefresh()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ویرایش سانس"
      toast.error(msg)
    } finally {
      setEditLoading(false)
    }
  }

  async function confirmDeleteSlot() {
    if (!slotToDelete) return
    try {
      await api(`/api/v1/vendors/${vendorId}/slots/${slotToDelete.id}`, {
        method: "DELETE",
      })
      toast.success("زمان حذف شد")
      setSlotToDelete(null)
      onRefresh()
    } catch {
      toast.error("خطا در حذف زمان")
    }
  }

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
            ball_available: t.ball_available,
            ball_price: t.ball_available ? parseFloat(t.ball_price || "0") : 0,
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
    ball_available: boolean
    ball_price: number
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
          ball_available: data.ball_available,
          ball_price: data.ball_price,
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

  async function handleDeletePastSlots() {
    const now = new Date()
    const pastSlots = allSlots.filter(
      (s) => new Date(s.end_time) < now && !s.is_reserved
    )
    if (pastSlots.length === 0) {
      toast.info("سانس گذشته‌ای برای حذف وجود ندارد")
      return
    }
    let deleted = 0
    for (const slot of pastSlots) {
      try {
        await api(`/api/v1/vendors/${vendorId}/slots/${slot.id}`, {
          method: "DELETE",
        })
        deleted++
      } catch {
        // skip
      }
    }
    toast.success(`${toPersianDigits(deleted)} سانس گذشته حذف شد`)
    onRefresh()
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
                variant="destructive"
                size="sm"
                onClick={handleDeletePastSlots}
              >
                <Trash2 className="ml-1 size-3.5" />
                پاکسازی گذشته
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
            onSlotDelete={setSlotToDelete}
            onSlotEdit={handleEditSlot}
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

      {/* Slot delete confirmation */}
      <AlertDialog
        open={!!slotToDelete}
        onOpenChange={(open) => {
          if (!open) setSlotToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف زمان</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این زمان اطمینان دارید؟ این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDeleteSlot}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Slot edit dialog */}
      <Dialog
        open={!!editingSlot}
        onOpenChange={(open) => {
          if (!open) setEditingSlot(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش سانس</DialogTitle>
            <DialogDescription>
              زمان و قیمت سانس را ویرایش کنید
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-start">زمان شروع</Label>
                <Input
                  id="edit-start"
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">زمان پایان</Label>
                <Input
                  id="edit-end"
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">قیمت (تومان)</Label>
              <PersianInput
                id="edit-price"
                placeholder="مثلاً ۵۰۰,۰۰۰"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={editBallAvailable}
                  onCheckedChange={(checked) =>
                    setEditBallAvailable(checked === true)
                  }
                />
                امکان رزرو توپ برای این سانس
              </label>
              <div className="space-y-2">
                <Label htmlFor="edit-ball-price">قیمت توپ (تومان)</Label>
                <PersianInput
                  id="edit-ball-price"
                  placeholder="مثلاً ۵۰,۰۰۰"
                  value={editBallPrice}
                  onChange={(e) => setEditBallPrice(e.target.value)}
                  disabled={!editBallAvailable}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSlot(null)}>
              انصراف
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={
                editLoading || !editStartTime || !editEndTime || !editPrice
              }
            >
              {editLoading ? (
                <>
                  <Loader2 className="ml-1 size-4 animate-spin" />
                  در حال ذخیره...
                </>
              ) : (
                "ذخیره"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

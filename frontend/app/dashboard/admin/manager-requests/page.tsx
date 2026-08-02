"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, ClipboardCheck, Loader2, RefreshCw, X } from "lucide-react"
import { api, ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
import { toPersianDigits } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  SearchInput,
  DataTableToolbar,
} from "@/components/ui/data-table-toolbar"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"

type RequestStatus = "pending" | "approved" | "rejected"

interface ManagerRequest {
  id: number
  user_id: number
  vendor_name: string
  phone: string
  message: string | null
  status: RequestStatus
  admin_note: string | null
  created_at: string | null
  updated_at: string | null
}

interface DecisionTarget {
  request: ManagerRequest
  status: Exclude<RequestStatus, "pending">
}

const statusLabels: Record<RequestStatus, string> = {
  pending: "در انتظار بررسی",
  approved: "تأیید شده",
  rejected: "رد شده",
}

const statusClasses: Record<RequestStatus, string> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  approved:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  rejected:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return toPersianDigits(
    new Date(value).toLocaleString("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    })
  )
}

export default function AdminManagerRequestsPage() {
  const [requests, setRequests] = useState<ManagerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">(
    "pending"
  )
  const [decisionTarget, setDecisionTarget] = useState<DecisionTarget | null>(
    null
  )
  const [adminNote, setAdminNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api<{ requests: ManagerRequest[] }>(
        "/api/v1/admin/manager-requests"
      )
      setRequests(response.requests)
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "خطا در دریافت درخواست‌ها"
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchRequests(), 0)
    return () => clearTimeout(timer)
  }, [fetchRequests])

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase()
    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === "all" || request.status === statusFilter
      const matchesSearch =
        !query ||
        request.vendor_name.toLowerCase().includes(query) ||
        request.phone.includes(query) ||
        String(request.user_id).includes(query) ||
        request.message?.toLowerCase().includes(query)
      return matchesStatus && matchesSearch
    })
  }, [requests, search, statusFilter])

  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length

  function openDecision(
    request: ManagerRequest,
    status: DecisionTarget["status"]
  ) {
    setAdminNote("")
    setDecisionTarget({ request, status })
  }

  function closeDecision() {
    if (submitting) return
    setDecisionTarget(null)
    setAdminNote("")
  }

  async function submitDecision() {
    if (!decisionTarget) return
    setSubmitting(true)
    try {
      const updated = await api<ManagerRequest>(
        `/api/v1/admin/manager-requests/${decisionTarget.request.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: decisionTarget.status,
            admin_note: adminNote.trim() || null,
          }),
        }
      )
      setRequests((current) =>
        current.map((request) =>
          request.id === updated.id ? updated : request
        )
      )
      toast.success(
        decisionTarget.status === "approved"
          ? "درخواست تأیید و نقش کاربر به مدیر مجموعه تغییر کرد"
          : "درخواست رد شد"
      )
      setDecisionTarget(null)
      setAdminNote("")
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "خطا در ثبت تصمیم"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            درخواست‌های مدیریت مجموعه
          </h1>
          <p className="text-muted-foreground">
            درخواست کاربران برای دریافت نقش مدیر مجموعه را بررسی کنید.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusClasses.pending}>
            {toPersianDigits(pendingCount)} درخواست در انتظار
          </Badge>
          <Button variant="outline" onClick={fetchRequests} disabled={loading}>
            <RefreshCw
              className={loading ? "me-1 size-4 animate-spin" : "me-1 size-4"}
            />
            بروزرسانی
          </Button>
        </div>
      </div>

      <DataTableToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="جستجوی مجموعه، تلفن یا شناسه کاربر..."
        />
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as RequestStatus | "all")
          }
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>وضعیت درخواست</SelectLabel>
              <SelectItem value="all">همه درخواست‌ها</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </DataTableToolbar>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="me-2 size-5 animate-spin" />
            در حال دریافت درخواست‌ها...
          </CardContent>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ClipboardCheck className="size-12 text-muted-foreground" />
            <p className="text-lg font-medium">درخواستی یافت نشد</p>
            <p className="text-sm text-muted-foreground">
              درخواست جدید یا منطبق با فیلتر انتخاب‌شده وجود ندارد.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table className="min-w-300 table-fixed">
            <colgroup>
              <col className="w-52" />
              <col className="w-44" />
              <col className="w-72" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-56" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>مجموعه پیشنهادی</TableHead>
                <TableHead>کاربر</TableHead>
                <TableHead>توضیحات کاربر</TableHead>
                <TableHead className="text-center">تاریخ</TableHead>
                <TableHead className="text-center">وضعیت</TableHead>
                <TableHead className="text-center">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.vendor_name}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span dir="ltr" className="inline-block">
                        {toPersianDigits(request.phone)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      شناسه کاربر: {toPersianDigits(request.user_id)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="line-clamp-3 text-sm whitespace-pre-wrap text-muted-foreground">
                      {request.message || "—"}
                    </p>
                    {request.admin_note && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        توضیح ادمین: {request.admin_note}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {formatDate(request.created_at)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={statusClasses[request.status]}
                    >
                      {statusLabels[request.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {request.status === "pending" ? (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => openDecision(request, "approved")}
                        >
                          <Check className="me-1 size-4" />
                          تأیید
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDecision(request, "rejected")}
                        >
                          <X className="me-1 size-4" />
                          رد
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        تعیین تکلیف شده
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ResponsiveDialog
        open={!!decisionTarget}
        onOpenChange={(open) => !open && closeDecision()}
      >
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {decisionTarget?.status === "approved"
                ? "تأیید درخواست مدیریت مجموعه"
                : "رد درخواست مدیریت مجموعه"}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              درخواست «{decisionTarget?.request.vendor_name}» برای کاربر با
              شماره {toPersianDigits(decisionTarget?.request.phone || "")} تعیین
              تکلیف می‌شود.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-2 px-4 sm:px-0">
            <Label htmlFor="manager-request-admin-note">
              توضیح ادمین (اختیاری)
            </Label>
            <Textarea
              id="manager-request-admin-note"
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              placeholder="در صورت نیاز، دلیل یا توضیح تصمیم را بنویسید..."
              maxLength={2000}
              rows={4}
              disabled={submitting}
            />
          </div>

          <ResponsiveDialogFooter>
            <Button
              variant="outline"
              onClick={closeDecision}
              disabled={submitting}
            >
              انصراف
            </Button>
            <Button
              variant={
                decisionTarget?.status === "rejected"
                  ? "destructive"
                  : "default"
              }
              onClick={submitDecision}
              disabled={submitting}
            >
              {submitting && <Loader2 className="me-1 size-4 animate-spin" />}
              {decisionTarget?.status === "approved"
                ? "تأیید درخواست"
                : "رد درخواست"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}

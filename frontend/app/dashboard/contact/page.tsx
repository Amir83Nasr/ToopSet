"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits, formatPersianDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@/components/ui/responsive-alert-dialog"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog"
import { TablePagination } from "@/components/ui/pagination"
import { toast } from "@/lib/toast"
import { Loader2, Mail, Phone, Trash2, User, X } from "lucide-react"
import { MobileBackButton } from "@/components/dashboard/mobile-back-button"
import {
  SearchInput,
  DataTableToolbar,
} from "@/components/ui/data-table-toolbar"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { toLocalDateStr, todayStr } from "@/lib/utils"

interface ContactMessage {
  id: number
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  created_at: string
}

function formatDate(iso: string): string {
  return formatPersianDate(iso)
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran",
  })
}

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState(todayStr())

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(
    null
  )
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null)
  const limit = 20

  const filteredMessages = messages
    .filter((msg) => {
      if (!debouncedSearch) return true
      const q = debouncedSearch.trim().toLowerCase()
      return (
        msg.name.toLowerCase().includes(q) ||
        msg.email.toLowerCase().includes(q) ||
        msg.subject.toLowerCase().includes(q)
      )
    })
    .filter((msg) => {
      if (
        dateFrom &&
        new Date(msg.created_at) < new Date(dateFrom + "T00:00:00")
      )
        return false
      if (dateTo && new Date(msg.created_at) > new Date(dateTo + "T23:59:59"))
        return false
      return true
    })

  const paginatedMessages = filteredMessages.slice(
    page * limit,
    page * limit + limit
  )
  const totalPages = Math.ceil(filteredMessages.length / limit)

  const hasActiveFilter = dateFrom !== "" || debouncedSearch !== ""

  function clearFilters() {
    setDateFrom("")
    setDateTo(todayStr())
    setSearch("")
  }

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<ContactMessage[]>(
        `/api/v1/contact/admin?skip=${page * limit}&limit=${limit}`
      )
      setMessages(data)
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    const timer = setTimeout(() => fetchMessages(), 0)
    return () => clearTimeout(timer)
  }, [fetchMessages])

  async function handleDelete(msg: ContactMessage) {
    try {
      await api(`/api/v1/contact/admin/${msg.id}`, { method: "DELETE" })
      toast.success("پیام با موفقیت حذف شد")
      setDeleteTarget(null)
      setSelectedMessage(null)
      fetchMessages()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در حذف پیام"
      toast.error(msg)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">پیام‌های تماس</h1>
          <p className="text-muted-foreground">
            مدیریت پیام‌های ارسال شده از صفحه تماس با ما
          </p>
        </div>
        <MobileBackButton />
      </div>

      {/* Search & filter bar */}
      <DataTableToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="جستجوی پیام..."
        />
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            value={{
              from: dateFrom ? new Date(dateFrom + "T12:00:00") : undefined,
              to: dateTo ? new Date(dateTo + "T12:00:00") : undefined,
            }}
            onChange={(range) => {
              setDateFrom(range?.from ? toLocalDateStr(range.from) : "")
              setDateTo(range?.to ? toLocalDateStr(range.to) : todayStr())
            }}
            className="w-fit"
          />
          {hasActiveFilter && (
            <Button variant="outline" onClick={clearFilters}>
              <X className="me-1.5 size-4" />
              حذف فیلتر
            </Button>
          )}
        </div>
      </DataTableToolbar>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="me-2 size-5 animate-spin" />
          در حال بارگذاری...
        </div>
      ) : messages.length === 0 ? (
        /* Empty */
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <Mail className="size-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">پیامی یافت نشد</p>
          </CardContent>
        </Card>
      ) : paginatedMessages.length === 0 ? (
        /* Filtered empty */
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <Mail className="size-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              پیامی با این جستجو یافت نشد
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Messages table */}
          <div>
            <Table className="min-w-220 table-fixed">
              <colgroup>
                <col className="w-40" />
                <col className="w-52" />
                <col className="w-56" />
                <col className="w-32" />
                <col className="w-24" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>فرستنده</TableHead>
                  <TableHead className="text-center">ایمیل</TableHead>
                  <TableHead>موضوع</TableHead>
                  <TableHead className="text-center">تاریخ</TableHead>
                  <TableHead className="text-center">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMessages.map((msg) => (
                  <TableRow
                    key={msg.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedMessage(msg)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{msg.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      <span dir="ltr" className="inline-block">
                        {msg.email || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="truncate">{msg.subject}</p>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      <div>{formatDate(msg.created_at)}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        <span dir="ltr" className="inline-block">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div
                        className="flex items-center justify-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon-sm"
                              onClick={() => setDeleteTarget(msg)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>حذف پیام</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <TablePagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {/* Message detail dialog */}
      <ResponsiveDialog
        open={!!selectedMessage}
        onOpenChange={(open) => !open && setSelectedMessage(null)}
      >
        <ResponsiveDialogContent className="max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {selectedMessage?.subject}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="sr-only">
              {selectedMessage?.name} — {selectedMessage?.email}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="space-y-4 p-0 pt-2 text-right">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="size-4" />
                <span>{selectedMessage?.name}</span>
              </div>
              <div
                className="flex items-center gap-1.5 text-muted-foreground"
                dir="ltr"
              >
                <Mail className="size-4" />
                <span>{selectedMessage?.email}</span>
              </div>
              {selectedMessage?.phone && (
                <div
                  className="flex items-center gap-1.5 text-muted-foreground"
                  dir="ltr"
                >
                  <Phone className="size-4" />
                  <span>{toPersianDigits(selectedMessage.phone)}</span>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm leading-relaxed">
              {selectedMessage?.message}
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedMessage && formatDate(selectedMessage.created_at)}
            </div>
          </div>
          <ResponsiveDialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedMessage(null)}>
              بستن
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedMessage && setDeleteTarget(selectedMessage)
              }
            >
              <Trash2 className="me-1 size-4" />
              حذف پیام
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Delete confirmation */}
      <ResponsiveAlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>حذف پیام</ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              آیا از حذف این پیام مطمئن هستید؟ این عمل قابل بازگشت نیست.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel>انصراف</ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              حذف
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </div>
  )
}

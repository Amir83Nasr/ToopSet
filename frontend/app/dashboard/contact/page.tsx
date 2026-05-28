"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  Trash2,
  User,
} from "lucide-react"

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
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(
    null
  )
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null)
  const limit = 20

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">پیام‌های تماس</h1>
        <p className="text-muted-foreground">
          مدیریت پیام‌های ارسال شده از صفحه تماس با ما
        </p>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="ml-2 size-5 animate-spin" />
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
      ) : (
        <>
          {/* Messages table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>فرستنده</TableHead>
                  <TableHead>موضوع</TableHead>
                  <TableHead>تاریخ</TableHead>
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((msg) => (
                  <TableRow
                    key={msg.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedMessage(msg)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{msg.name}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">
                          {msg.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate">{msg.subject}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(msg.created_at)}
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(msg)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">صفحه {page + 1}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronRight className="ml-1 size-4" />
                  قبلی
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={messages.length < limit}
                  onClick={() => setPage((p) => p + 1)}
                >
                  بعدی
                  <ChevronLeft className="mr-1 size-4" />
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Message detail dialog */}
      <AlertDialog
        open={!!selectedMessage}
        onOpenChange={(open) => !open && setSelectedMessage(null)}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{selectedMessage?.subject}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-right">
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
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>بستن</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              onClick={() =>
                selectedMessage && setDeleteTarget(selectedMessage)
              }
            >
              <Trash2 className="ml-1 size-4" />
              حذف پیام
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف پیام</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این پیام مطمئن هستید؟ این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

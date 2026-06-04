"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { PersianInput } from "@/components/ui/persian-input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "@/lib/toast"
import {
  Star,
  MessageSquare,
  Flag,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"

// --- Types ---

interface Review {
  id: number
  user_id: number
  court_id: number
  booking_id: number
  rating: number
  comment: string | null
  is_reported: boolean
  created_at: string
}

interface ReviewDetail extends Review {
  court_name: string
  user_name: string
}

type Tab = "my" | "all"

// --- Helpers ---

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString("fa-IR")} ${d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}`
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }
        />
      ))}
    </div>
  )
}

// --- Page ---

export default function ReviewsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const isManager = user?.role === "manager"

  const [activeTab, setActiveTab] = useState<Tab>("my")
  const [reviews, setReviews] = useState<ReviewDetail[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 20

  // Create-review dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newBookingId, setNewBookingId] = useState("")
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Report state
  const [reportingId, setReportingId] = useState<number | null>(null)
  // Respond & Delete state
  const [respondDialogOpen, setRespondDialogOpen] = useState(false)
  const [respondReviewId, setRespondReviewId] = useState<number | null>(null)
  const [respondText, setRespondText] = useState("")
  const [responding, setResponding] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteReviewId, setDeleteReviewId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ reviews: ReviewDetail[]; total: number }>(
        `/api/v1/reviews/my?skip=${page * limit}&limit=${limit}`
      )
      setReviews(res.reviews)
      setTotal(res.total)
    } catch {
      // not authenticated
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    if (activeTab !== "my") return
    const timer = setTimeout(() => fetchReviews(), 0)
    return () => clearTimeout(timer)
  }, [activeTab, fetchReviews])

  async function handleCreateReview() {
    const bookingId = Number(newBookingId)
    if (!bookingId || isNaN(bookingId)) {
      toast.error("لطفاً یک شناسه رزرو معتبر وارد کنید")
      return
    }
    setSubmitting(true)
    try {
      await api("/api/v1/reviews", {
        method: "POST",
        body: JSON.stringify({
          booking_id: bookingId,
          rating: newRating,
          comment: newComment || undefined,
        }),
      })
      toast.success("نظر شما با موفقیت ثبت شد")
      setDialogOpen(false)
      setNewBookingId("")
      setNewRating(5)
      setNewComment("")
      fetchReviews()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ثبت نظر"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRespond() {
    if (!respondReviewId || !respondText.trim()) {
      toast.error("لطفاً متن پاسخ را وارد کنید")
      return
    }
    setResponding(true)
    try {
      await api(`/api/v1/reviews/${respondReviewId}/respond`, {
        method: "POST",
        body: JSON.stringify({ response: respondText }),
      })
      toast.success("پاسخ با موفقیت ثبت شد")
      setRespondDialogOpen(false)
      setRespondText("")
      setRespondReviewId(null)
      fetchReviews()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ثبت پاسخ"
      toast.error(msg)
    } finally {
      setResponding(false)
    }
  }

  async function handleDelete() {
    if (!deleteReviewId) return
    setDeleting(true)
    try {
      await api(`/api/v1/reviews/${deleteReviewId}`, { method: "DELETE" })
      toast.success("نظر با موفقیت حذف شد")
      setDeleteDialogOpen(false)
      setDeleteReviewId(null)
      fetchReviews()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در حذف نظر"
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  async function handleReport(reviewId: number) {
    setReportingId(reviewId)
    try {
      await api(`/api/v1/reviews/${reviewId}/report`, { method: "POST" })
      toast.success("نظر با موفقیت گزارش شد")
      fetchReviews()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در گزارش نظر"
      toast.error(msg)
    } finally {
      setReportingId(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  // --- Tab content ---

  function renderMyReviews() {
    if (loading) {
      return (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>مجموعه</TableHead>
                <TableHead>امتیاز</TableHead>
                <TableHead>نظر</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>وضعیت</TableHead>
                {(isAdmin || isManager) && (
                  <TableHead className="text-left">عملیات</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-[110px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[80px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[90px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[60px] rounded-full" />
                  </TableCell>
                  {(isAdmin || isManager) && (
                    <TableCell>
                      <Skeleton className="h-8 w-[60px] rounded-md" />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )
    }

    if (reviews.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Star className="size-10 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">هنوز نظری ثبت نشده</h3>
            <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
              پس از رزرو و استفاده از مجموعه‌ها می‌توانید نظر خود را ثبت کنید.
            </p>
            <Button asChild>
              <Link href="/dashboard/bookings">
                <MessageSquare className="ml-2 size-4" />
                مشاهده رزروها
              </Link>
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>مجموعه</TableHead>
              <TableHead>امتیاز</TableHead>
              <TableHead>نظر</TableHead>
              <TableHead>تاریخ</TableHead>
              <TableHead>وضعیت</TableHead>
              {(isAdmin || isManager) && (
                <TableHead className="text-left">عملیات</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((review) => (
              <TableRow key={review.id}>
                <TableCell className="font-medium">
                  {review.court_name}
                </TableCell>
                <TableCell>
                  <StarRating rating={review.rating} />
                </TableCell>
                <TableCell className="max-w-[250px]">
                  <p className="truncate text-muted-foreground">
                    {review.comment ?? (
                      <span className="text-muted-foreground/60 italic">
                        بدون نظر
                      </span>
                    )}
                  </p>
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {formatDateTime(review.created_at)}
                </TableCell>
                <TableCell>
                  {review.is_reported ? (
                    <Badge variant="destructive">گزارش شده</Badge>
                  ) : (
                    <Badge variant="outline">تایید شده</Badge>
                  )}
                </TableCell>
                {(isAdmin || isManager) && (
                  <TableCell>
                    <div className="flex gap-1">
                      {isManager && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRespondReviewId(review.id)
                            setRespondText("")
                            setRespondDialogOpen(true)
                          }}
                        >
                          <MessageSquare className="ml-1 size-3" />
                          پاسخ
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={
                            reportingId === review.id || review.is_reported
                          }
                          onClick={() => handleReport(review.id)}
                        >
                          {reportingId === review.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Flag className="size-4" />
                          )}
                          <span className="mr-1">گزارش</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              صفحه {toPersianDigits(page + 1)} از {toPersianDigits(totalPages)}
            </p>
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
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                بعدی
                <ChevronLeft className="mr-1 size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    )
  }

  function renderAllReviews() {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 rounded-full bg-muted p-4">
            <MessageSquare className="size-10 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">به زودی</h3>
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            بخش نظرات مجموعه‌ها به زودی اضافه می‌شود
          </p>
        </CardContent>
      </Card>
    )
  }

  // --- Render ---

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">نظرات</h1>
          <p className="text-muted-foreground">
            مدیریت و ثبت نظرات برای مجموعه‌های ورزشی
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 size-4" />
              ثبت نظر جدید
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ثبت نظر جدید</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              {/* Booking ID input (simplified MVP) */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="booking-id">شناسه رزرو</Label>
                <PersianInput
                  id="booking-id"
                  placeholder="شناسه رزرو را وارد کنید"
                  value={newBookingId}
                  onChange={(e) => setNewBookingId(e.target.value)}
                  dir="ltr"
                />
              </div>

              {/* Star rating selector */}
              <div className="flex flex-col gap-2">
                <Label>امتیاز</Label>
                <div className="flex items-center gap-1" dir="ltr">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="transition-all hover:scale-110 focus:outline-none"
                    >
                      <Star
                        size={28}
                        className={
                          star <= newRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30 hover:text-amber-400/50"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment textarea */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="comment">نظر (اختیاری)</Label>
                <Textarea
                  id="comment"
                  placeholder="نظر خود را بنویسید..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateReview} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="ml-2 size-4 animate-spin" />
                    در حال ثبت...
                  </>
                ) : (
                  "ثبت نظر"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex w-fit gap-1 rounded-lg bg-muted p-1" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "my"}
          onClick={() => setActiveTab("my")}
          className={
            "rounded-md px-4 py-2 text-sm font-medium transition-all " +
            (activeTab === "my"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          نظرات من
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "all"}
          onClick={() => setActiveTab("all")}
          className={
            "rounded-md px-4 py-2 text-sm font-medium transition-all " +
            (activeTab === "all"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          نظرات مجموعه‌ها
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "my" ? renderMyReviews() : renderAllReviews()}

      {/* Respond dialog */}
      <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>پاسخ به نظر</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="respond-text">متن پاسخ</Label>
              <Textarea
                id="respond-text"
                placeholder="پاسخ خود را بنویسید..."
                value={respondText}
                onChange={(e) => setRespondText(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleRespond} disabled={responding}>
                {responding ? "در حال ثبت..." : "ثبت پاسخ"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف نظر</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            آیا از حذف این نظر اطمینان دارید؟ این عمل قابل بازگشت نیست.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "در حال حذف..." : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

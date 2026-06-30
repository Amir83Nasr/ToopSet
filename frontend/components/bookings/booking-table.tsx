"use client"

import { toPersianDigits } from "@/lib/utils"
import { BOOKING_STATUS_LABELS } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { CreditCard, XCircle, Loader2 } from "lucide-react"
import type { BookingDetail } from "@/components/bookings/types"

/* ── Helpers ── */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/* ── Props ── */

interface BookingTableProps {
  bookings: BookingDetail[]
  totalPages: number
  page: number
  onPageChange: (page: number) => void
  payingId: number | null
  onPay: (bookingId: number) => void
  onCancelClick: (booking: BookingDetail) => void
}

export function BookingTable({
  bookings,
  totalPages,
  page,
  onPageChange,
  payingId,
  onPay,
  onCancelClick,
}: BookingTableProps) {
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>مجموعه</TableHead>
            <TableHead className="w-24">تاریخ</TableHead>
            <TableHead className="w-28">ساعت</TableHead>
            <TableHead className="w-28">مبلغ</TableHead>
            <TableHead className="w-16">تعداد</TableHead>
            <TableHead className="w-20">وضعیت</TableHead>
            <TableHead className="w-40 text-right">عملیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((b) => {
            const st = BOOKING_STATUS_LABELS[b.status] || {
              label: b.status,
              variant: "outline" as const,
            }
            return (
              <TableRow key={b.id}>
                <TableCell className="max-w-48 truncate font-medium">
                  {b.vendor_name}
                </TableCell>
                <TableCell>
                  {b.slot_start_time ? formatDate(b.slot_start_time) : "-"}
                </TableCell>
                <TableCell>
                  {b.slot_start_time && b.slot_end_time
                    ? `${formatTime(b.slot_start_time)} - ${formatTime(b.slot_end_time)}`
                    : "-"}
                </TableCell>
                <TableCell>
                  {new Intl.NumberFormat("fa-IR").format(b.price_paid)} تومان
                </TableCell>
                <TableCell>{toPersianDigits(b.participants_count)}</TableCell>
                <TableCell>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {b.status === "pending_payment" && (
                      <>
                        <Button
                          size="sm"
                          disabled={payingId === b.id}
                          onClick={() => onPay(b.id)}
                        >
                          {payingId === b.id ? (
                            <Loader2 className="ml-1 size-4 animate-spin" />
                          ) : (
                            <CreditCard className="ml-1 size-4" />
                          )}
                          پرداخت
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCancelClick(b)}
                        >
                          <XCircle className="ml-1 size-4" />
                          لغو
                        </Button>
                      </>
                    )}
                    {b.status === "confirmed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCancelClick(b)}
                      >
                        <XCircle className="ml-1 size-4" />
                        لغو
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-muted-foreground">
            صفحه {toPersianDigits(page + 1)} از {toPersianDigits(totalPages)}
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  text="قبلی"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    onPageChange(page - 1)
                  }}
                  className={page === 0 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  text="بعدی"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    onPageChange(page + 1)
                  }}
                  className={
                    page >= totalPages - 1
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}

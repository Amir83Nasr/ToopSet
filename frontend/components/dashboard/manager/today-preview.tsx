"use client"

import { useMemo } from "react"
import Link from "next/link"
import { CalendarDays, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  formatTime,
  getSlotStatus,
} from "@/components/dashboard/schedule/utils"
import type { TimeSlot } from "@/components/dashboard/schedule/types"

interface TodayPreviewProps {
  slots: TimeSlot[]
  loading?: boolean
}

export function TodayPreview({ slots, loading }: TodayPreviewProps) {
  const todaySlots = useMemo(() => {
    const todayKey = new Date().toLocaleDateString("en-CA")
    return slots
      .filter(
        (s) => new Date(s.start_time).toLocaleDateString("en-CA") === todayKey
      )
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
  }, [slots])

  const available = todaySlots.filter(
    (s) => getSlotStatus(s) === "available"
  ).length
  const reserved = todaySlots.filter(
    (s) => getSlotStatus(s) === "reserved"
  ).length

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">برنامه امروز</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    )
  }

  if (todaySlots.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">برنامه امروز</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-4">
            <CalendarDays className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              برنامه‌ای برای امروز ثبت نشده
            </p>
            <Button variant="outline" asChild>
              <Link href="/dashboard/manager/schedule">رفتن به زمان‌بندی</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">برنامه امروز</CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-primary" />
              {available} آزاد
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-destructive" />
              {reserved} رزرو
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {todaySlots.slice(0, 8).map((slot) => {
            const status = getSlotStatus(slot)
            return (
              <div
                key={slot.id}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${
                  status === "available"
                    ? "border-primary/20 bg-primary/5"
                    : status === "reserved"
                      ? "border-destructive/20 bg-destructive/5"
                      : "border-muted bg-muted/20 opacity-60"
                }`}
              >
                <span className="font-medium">
                  {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                </span>
                <Badge
                  variant={status === "available" ? "outline" : "secondary"}
                  className="px-1 py-0 text-[10px]"
                >
                  {status === "available"
                    ? "آزاد"
                    : status === "reserved"
                      ? "رزرو"
                      : "گذشته"}
                </Badge>
              </div>
            )
          })}
          {todaySlots.length > 8 && (
            <Link
              href="/dashboard/manager/schedule"
              className="flex shrink-0 items-center gap-1 rounded-lg border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              +{todaySlots.length - 8} بیشتر
              <ChevronLeft className="size-3" />
            </Link>
          )}
        </div>
        <div className="mt-3">
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            asChild
          >
            <Link href="/dashboard/manager/schedule">
              مشاهده برنامه کامل هفته
              <ChevronLeft className="mr-1 size-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

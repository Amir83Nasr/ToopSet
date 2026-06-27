"use client"

import { useCallback, useState } from "react"
import { toPersianDigits } from "@/lib/utils"
import { TextListDisplay } from "@/components/public/text-list-display"

function formatPersianDate(iso: string): string {
  const d = new Date(iso)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const py = d.getFullYear() - 621
  const monthNames = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ]
  return `${toPersianDigits(day)} ${monthNames[month - 1]} ${toPersianDigits(py)}`
}

interface Props {
  settingKey: string
}

export function PrivacyTermsContent({ settingKey }: Props) {
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [dateLoading, setDateLoading] = useState(true)

  const handleUpdatedAt = useCallback((date: string | null) => {
    setUpdatedAt(date)
    setDateLoading(false)
  }, [])

  return (
    <>
      <p className="mt-2 text-sm text-muted-foreground">
        آخرین به‌روزرسانی:{" "}
        {dateLoading
          ? "..."
          : updatedAt
            ? formatPersianDate(updatedAt)
            : "تیر ۱۴۰۴"}
      </p>

      <div className="mt-12">
        <TextListDisplay
          settingKey={settingKey}
          onUpdatedAt={handleUpdatedAt}
        />
      </div>
    </>
  )
}

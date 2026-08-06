"use client"

import { useCallback, useState } from "react"
import { ShieldCheck, FileText, Clock } from "lucide-react"
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

const meta = {
  privacy_text: {
    icon: ShieldCheck,
    title: "حریم خصوصی",
    description: "چگونه از اطلاعات شما محافظت می‌کنیم",
  },
  rules_text: {
    icon: FileText,
    title: "قوانین و مقررات",
    description: "شرایط استفاده از سرویس‌های توپ‌سِت",
  },
} as const

interface Props {
  settingKey: "privacy_text" | "rules_text"
}

export function PrivacyTermsContent({ settingKey }: Props) {
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [dateLoading, setDateLoading] = useState(true)

  const handleUpdatedAt = useCallback((date: string | null) => {
    setUpdatedAt(date)
    setDateLoading(false)
  }, [])

  const { icon: Icon, title, description } = meta[settingKey]

  return (
    <>
      {/* Header card */}
      <div className="animate-fade-in mt-8 overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center gap-4 px-5 py-5 md:px-7">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t bg-muted/40 px-5 py-3 text-xs text-muted-foreground md:px-7">
          <Clock className="size-4 shrink-0" />
          آخرین به‌روزرسانی:{" "}
          {dateLoading
            ? "..."
            : updatedAt
              ? formatPersianDate(updatedAt)
              : "تیر ۱۴۰۴"}
        </div>
      </div>

      <div className="mt-12">
        <TextListDisplay
          settingKey={settingKey}
          onUpdatedAt={handleUpdatedAt}
        />
      </div>
    </>
  )
}

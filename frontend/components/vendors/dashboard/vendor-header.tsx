"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Eye, Save, Loader2 } from "lucide-react"

interface VendorHeaderProps {
  vendorId: number
  vendorName: string
  activeTab: string
  saving: boolean
  isFormValid: boolean
  isSubmitting: boolean
}

export function VendorHeader({
  vendorId,
  vendorName,
  activeTab,
  saving,
  isFormValid,
  isSubmitting,
}: VendorHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight break-words sm:text-2xl">
          {vendorName}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          مدیریت اطلاعات مجموعه
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:w-auto">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/vendors">
            <ArrowRight className="size-4 shrink-0 sm:me-1.5" />
            بازگشت
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/vendors/${vendorId}`}>
            <Eye className="size-4 shrink-0 sm:me-1.5" />
            صفحه عمومی
          </Link>
        </Button>
        {activeTab === "basic" && (
          <Button
            type="submit"
            form="edit-form"
            size="sm"
            disabled={!isFormValid || isSubmitting || saving}
          >
            {saving || isSubmitting ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin sm:me-1.5" />
                در حال ذخیره...
              </>
            ) : (
              <>
                <Save className="size-4 shrink-0 sm:me-1.5" />
                ذخیره
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

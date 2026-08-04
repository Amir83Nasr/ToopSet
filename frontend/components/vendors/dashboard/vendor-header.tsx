"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Eye, Save, Loader2, Trash2 } from "lucide-react"

interface VendorHeaderProps {
  vendorId: number
  vendorName: string
  activeTab: string
  saving: boolean
  isFormValid: boolean
  isSubmitting: boolean
  canManage: boolean
  onDeleteClick: () => void
}

export function VendorHeader({
  vendorId,
  vendorName,
  activeTab,
  saving,
  isFormValid,
  isSubmitting,
  canManage,
  onDeleteClick,
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

      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href="/dashboard/vendors">
            <ArrowRight className="size-4 shrink-0 sm:me-1.5" />
            بازگشت
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="w-full" asChild>
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
            className="w-full"
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
        {canManage && (
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={onDeleteClick}
          >
            <Trash2 className="size-4 shrink-0 sm:me-1.5" />
            حذف
          </Button>
        )}
      </div>
    </div>
  )
}

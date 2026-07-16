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
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{vendorName}</h1>
        <p className="text-muted-foreground">مدیریت اطلاعات مجموعه</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" asChild>
          <Link href="/dashboard/vendors">
            <ArrowRight className="ml-1.5 size-4" />
            بازگشت
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/vendors/${vendorId}`}>
            <Eye className="ml-1.5 size-4" />
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
                <Loader2 className="ml-1.5 size-4 animate-spin" />
                در حال ذخیره...
              </>
            ) : (
              <>
                <Save className="ml-1.5 size-4" />
                ذخیره
              </>
            )}
          </Button>
        )}
        {canManage && (
          <Button variant="destructive" onClick={onDeleteClick}>
            <Trash2 className="ml-1.5 size-4" />
            حذف
          </Button>
        )}
      </div>
    </div>
  )
}

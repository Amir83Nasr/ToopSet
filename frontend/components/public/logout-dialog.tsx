"use client"

import { useState } from "react"
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
interface LogoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
}

/** Shared logout confirmation dialog (icon media, loading state, bottom-sheet on mobile). */
export function LogoutDialog({
  open,
  onOpenChange,
  onConfirm,
}: LogoutDialogProps) {
  const [loggingOut, setLoggingOut] = useState(false)

  return (
    <ResponsiveAlertDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveAlertDialogContent>
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>خروج از حساب</ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            آیا مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel disabled={loggingOut}>
            انصراف
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            variant="destructive"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true)
              try {
                await onConfirm()
                onOpenChange(false)
              } finally {
                setLoggingOut(false)
              }
            }}
          >
            {loggingOut ? "در حال خروج..." : "خروج"}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  )
}

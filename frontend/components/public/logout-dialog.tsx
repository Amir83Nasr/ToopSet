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
  ResponsiveAlertDialogMedia,
  ResponsiveAlertDialogTitle,
} from "@/components/ui/responsive-alert-dialog"
import { LogOut } from "lucide-react"

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
          <ResponsiveAlertDialogMedia className="bg-destructive/10 dark:bg-destructive/20">
            <LogOut className="text-destructive" />
          </ResponsiveAlertDialogMedia>
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

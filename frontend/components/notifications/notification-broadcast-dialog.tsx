"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Loader2, Send } from "lucide-react"

interface NotificationBroadcastDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: string
  onMessageChange: (val: string) => void
  onSend: () => void
  broadcasting: boolean
}

export function NotificationBroadcastDialog({
  open,
  onOpenChange,
  message,
  onMessageChange,
  onSend,
  broadcasting,
}: NotificationBroadcastDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="p-3">
          <DialogTitle className="text-lg font-bold">
            اعلان همگانی جدید
          </DialogTitle>
          <DialogDescription>
            پیام خود را وارد کنید. این اعلان برای همه کاربران ارسال خواهد شد.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSend()
          }}
          className="space-y-4"
        >
          <Textarea
            id="broadcast-msg"
            placeholder="متن اعلان را وارد کنید..."
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            rows={4}
            required
            autoFocus
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                onMessageChange("")
              }}
              disabled={broadcasting}
            >
              انصراف
            </Button>
            <Button type="submit" disabled={broadcasting || !message.trim()}>
              {broadcasting ? (
                <>
                  <Loader2 className="ml-1 size-4 animate-spin" />
                  در حال ارسال...
                </>
              ) : (
                <>
                  <Send className="ml-1 size-4" />
                  ارسال برای همه
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

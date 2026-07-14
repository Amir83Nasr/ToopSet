"use client"

import { useCallback, useEffect, useState } from "react"
import { Building2, CheckCircle2, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { toast } from "@/lib/toast"
import { toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"

type Step =
  | "loading"
  | "explain"
  | "form"
  | "submitting"
  | "success"
  | "pending"

type PendingRequest = {
  id: number
  vendor_name: string
  status: string
  created_at: string
}

type SubmitError = {
  status: number
  message: string
}

export function RegisterComplexDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuth()

  const [step, setStep] = useState<Step>("loading")
  const [vendorName, setVendorName] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<SubmitError | null>(null)

  // Check for existing pending request on mount
  useEffect(() => {
    if (!open) return

    const id = setTimeout(() => {
      if (!user) {
        setStep("explain")
        return
      }

      setStep("loading")
      api<PendingRequest>("/api/v1/manager-requests/my")
        .then((res) => {
          if (res && res.status === "pending") {
            setStep("pending")
          } else {
            setStep("explain")
          }
        })
        .catch(() => {
          setStep("explain")
        })
        .finally(() => {
          setError(null)
        })
    })

    return () => clearTimeout(id)
  }, [open, user])

  const handleSubmit = useCallback(async () => {
    if (!vendorName.trim()) return
    setStep("submitting")
    setError(null)

    try {
      await api("/api/v1/manager-requests", {
        method: "POST",
        body: JSON.stringify({
          vendor_name: vendorName.trim(),
          phone: phone.trim(),
          message: message.trim() || undefined,
        }),
      })
      setStep("success")
      toast.success("درخواست شما با موفقیت ثبت شد")
    } catch (err) {
      const apiErr = err as SubmitError
      setError(apiErr)
      if (apiErr?.status === 409) {
        setStep("pending")
      } else {
        toast.error(apiErr?.message || "خطا در ثبت درخواست")
        setStep("form")
      }
    }
  }, [vendorName, phone, message])

  const handleRetry = useCallback(() => {
    setError(null)
    setStep("explain")
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Loading */}
        {step === "loading" && (
          <>
            <DialogTitle className="sr-only">در حال دریافت اطلاعات</DialogTitle>
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                در حال دریافت اطلاعات...
              </p>
            </div>
          </>
        )}

        {/* Explain — Step 1 */}
        {step === "explain" && (
          <>
            <DialogHeader>
              <DialogTitle>ثبت مجموعه جدید</DialogTitle>
              <DialogDescription>
                برای ثبت مجموعه ورزشی، نیاز به نقش <strong>مدیر مجموعه</strong>{" "}
                دارید.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 rounded-lg border p-4 text-sm leading-relaxed">
              <p>
                نقش مدیر مجموعه توسط ادمین سامانه اعطا می‌شود. پس از دریافت این
                دسترسی می‌توانید مجموعه ورزشی خود را ثبت کنید.
              </p>
              <p className="font-medium text-muted-foreground">مراحل:</p>
              <ol className="mr-4 list-outside list-decimal space-y-2 text-muted-foreground">
                <li>اطلاعات خود را برای ادمین ارسال کنید</li>
                <li>ادمین درخواست شما را بررسی می‌کند</li>
                <li>پس از تأیید، دسترسی مدیر مجموعه برای شما فعال می‌شود</li>
                <li>سپس می‌توانید مجموعه خود را ثبت کنید</li>
              </ol>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="outline">بازگشت</Button>
              </DialogClose>
              <Button
                onClick={() => {
                  if (user?.phone) setPhone(user.phone)
                  setStep("form")
                }}
              >
                <Send className="ml-1 size-4" />
                ارسال درخواست
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Form — Step 2 */}
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>اطلاعات درخواست</DialogTitle>
              <DialogDescription>
                اطلاعات زیر را برای ارسال درخواست به ادمین وارد کنید.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error.message || "خطا در ثبت درخواست. دوباره تلاش کنید."}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="vendor-name">نام مجموعه</Label>
                <Input
                  id="vendor-name"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="مثال: مجموعه ورزشی شهدا"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">شماره تماس</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="text-end"
                  inputMode="numeric"
                  placeholder={toPersianDigits("09123456789")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">پیام (اختیاری)</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="توضیحات یا پیام شما برای ادمین..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep("explain")}>
                بازگشت
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!vendorName.trim() || !phone.trim()}
              >
                <Send className="ml-1 size-4" />
                ارسال درخواست
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Submitting — Step 3 */}
        {step === "submitting" && (
          <>
            <DialogTitle className="sr-only">در حال ارسال درخواست</DialogTitle>
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">در حال ارسال درخواست...</p>
            </div>
          </>
        )}

        {/* Success — Step 4 */}
        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-status-confirmed" />
                درخواست با موفقیت ثبت شد
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 rounded-lg border p-4 text-sm leading-relaxed">
              <p>درخواست شما برای ادمین ارسال شد.</p>
              <ul className="mr-4 list-outside list-disc space-y-2 text-muted-foreground">
                <li>ادمین درخواست شما را بررسی خواهد کرد</li>
                <li>پس از تأیید، دسترسی مدیر مجموعه برای شما فعال می‌شود</li>
                <li>از طریق پیام درون‌برنامه‌ای از نتیجه مطلع خواهید شد</li>
              </ul>
              <p className="mt-3 font-medium">
                پس از دریافت دسترسی، می‌توانید از این دکمه برای ثبت مجموعه خود
                استفاده کنید.
              </p>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button className="w-full sm:w-auto">متوجه شدم</Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}

        {/* Pending — existing request found */}
        {step === "pending" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-muted-foreground" />
                درخواست در انتظار بررسی
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 rounded-lg border p-4 text-sm leading-relaxed">
              <p>
                شما قبلاً یک درخواست ثبت کرده‌اید که در انتظار بررسی ادمین است.
              </p>
              <ul className="mr-4 list-outside list-disc space-y-2 text-muted-foreground">
                <li>
                  پس از تأیید ادمین، دسترسی مدیر مجموعه برای شما فعال می‌شود
                </li>
                <li>از طریق پیام درون‌برنامه‌ای از نتیجه مطلع خواهید شد</li>
              </ul>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button className="w-full sm:w-auto">متوجه شدم</Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}

        {/* Error with retry (used by toast.error fallback) */}
        {step === "explain" && error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error.message}
            <Button variant="link" size="sm" onClick={handleRetry}>
              تلاش دوباره
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

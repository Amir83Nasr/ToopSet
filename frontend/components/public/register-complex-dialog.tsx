"use client"

import { useCallback, useEffect, useState } from "react"
import { Building2, CheckCircle2, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        {/* Loading */}
        {step === "loading" && (
          <>
            <ResponsiveDialogTitle className="sr-only">
              در حال دریافت اطلاعات
            </ResponsiveDialogTitle>
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
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>ثبت مجموعه جدید</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                برای ثبت مجموعه ورزشی، نیاز به نقش <strong>مدیر مجموعه</strong>{" "}
                دارید.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

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

            <ResponsiveDialogFooter className="gap-2 sm:gap-0">
              <ResponsiveDialogClose asChild>
                <Button variant="outline">بازگشت</Button>
              </ResponsiveDialogClose>
              <Button
                onClick={() => {
                  if (user?.phone) setPhone(user.phone)
                  setStep("form")
                }}
              >
                <Send className="ml-1 size-4" />
                ارسال درخواست
              </Button>
            </ResponsiveDialogFooter>
          </>
        )}

        {/* Form — Step 2 */}
        {step === "form" && (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>اطلاعات درخواست</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                اطلاعات زیر را برای ارسال درخواست به ادمین وارد کنید.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

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

            <ResponsiveDialogFooter className="gap-2 sm:gap-0">
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
            </ResponsiveDialogFooter>
          </>
        )}

        {/* Submitting — Step 3 */}
        {step === "submitting" && (
          <>
            <ResponsiveDialogTitle className="sr-only">
              در حال ارسال درخواست
            </ResponsiveDialogTitle>
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">در حال ارسال درخواست...</p>
            </div>
          </>
        )}

        {/* Success — Step 4 */}
        {step === "success" && (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-status-confirmed" />
                درخواست با موفقیت ثبت شد
              </ResponsiveDialogTitle>
            </ResponsiveDialogHeader>

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

            <ResponsiveDialogFooter>
              <ResponsiveDialogClose asChild>
                <Button className="w-full sm:w-auto">متوجه شدم</Button>
              </ResponsiveDialogClose>
            </ResponsiveDialogFooter>
          </>
        )}

        {/* Pending — existing request found */}
        {step === "pending" && (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-muted-foreground" />
                درخواست در انتظار بررسی
              </ResponsiveDialogTitle>
            </ResponsiveDialogHeader>

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

            <ResponsiveDialogFooter>
              <ResponsiveDialogClose asChild>
                <Button className="w-full sm:w-auto">متوجه شدم</Button>
              </ResponsiveDialogClose>
            </ResponsiveDialogFooter>
          </>
        )}

        {/* Error with retry (used by toast.error fallback) */}
        {step === "explain" && error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error.message}
            <Button variant="link" onClick={handleRetry}>
              تلاش دوباره
            </Button>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

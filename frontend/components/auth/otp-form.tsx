"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  otpPhoneSchema,
  verifyOtpSchema,
  type OtpPhoneInput,
  type VerifyOtpInput,
} from "@/lib/validations"
import { toEnglishDigits, toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldDescription,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { HugeiconsIcon } from "@hugeicons/react"
import { AiPhone01Icon, AiUserIcon } from "@hugeicons/core-free-icons"
import { toast } from "@/lib/toast"
import { ApiError } from "@/lib/api"
import type { UseAuthReturn } from "@/hooks/use-auth"

type Step = "phone" | "verify"

interface Props {
  sendOtp: UseAuthReturn["sendOtp"]
  verifyOtp: UseAuthReturn["verifyOtp"]
  redirect?: string
  initialPhone?: string
  purpose?: "login" | "password_reset"
  onSuccess?: () => void
  onLoginClick?: (phone: string) => void
}

export function OtpForm({
  sendOtp,
  verifyOtp,
  redirect,
  initialPhone = "",
  purpose = "login",
  onSuccess,
  onLoginClick,
}: Props) {
  const [step, setStep] = useState<Step>(initialPhone ? "verify" : "phone")
  const [phone, setPhone] = useState(initialPhone)
  const [isNewUser, setIsNewUser] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [otpError, setOtpError] = useState("")
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const initialOtpSentRef = useRef(false)

  // ── Cleanup timer ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startResendTimer = useCallback((seconds: number) => {
    setResendTimer(Math.max(0, seconds))
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // ── Phone form ─────────────────────────────────────────────────────

  const phoneForm = useForm<OtpPhoneInput>({
    resolver: zodResolver(otpPhoneSchema),
    mode: "onChange",
    defaultValues: { phone: initialPhone },
  })

  async function onSendOtp(data: OtpPhoneInput) {
    setSending(true)
    setOtpError("")
    try {
      const res = await sendOtp(data)
      setPhone(data.phone)
      setIsNewUser(res.is_new_user)
      setHasPassword(res.has_password)
      setStep("verify")
      startResendTimer(res.expires_in)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در ارسال کد")
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (!initialPhone || initialOtpSentRef.current) return
    initialOtpSentRef.current = true
    onSendOtp({ phone: initialPhone })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhone])

  async function onResendOtp() {
    setSending(true)
    setOtpError("")
    try {
      const res = await sendOtp({ phone })
      setIsNewUser(res.is_new_user)
      setHasPassword(res.has_password)
      startResendTimer(res.expires_in)
      toast.success("کد تأیید مجدداً ارسال شد")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در ارسال کد")
    } finally {
      setSending(false)
    }
  }

  // ── Verify form ────────────────────────────────────────────────────

  const verifyForm = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
    mode: "onChange",
    defaultValues: { phone: "", code: "", full_name: undefined },
  })

  useEffect(() => {
    if (step === "verify") {
      verifyForm.setValue("phone", phone)
    }
  }, [step, phone, verifyForm])

  const codeValue = verifyForm.watch("code")

  async function onVerifyOtp(data: VerifyOtpInput) {
    setVerifying(true)
    setOtpError("")
    try {
      await verifyOtp(
        {
          phone: data.phone,
          code: data.code,
          purpose,
          ...(data.full_name ? { full_name: data.full_name } : {}),
        },
        redirect
      )
      onSuccess?.()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "خطا در تأیید کد"
      setOtpError(message)
    } finally {
      setVerifying(false)
    }
  }

  const handleBackToPhone = useCallback(() => {
    setStep("phone")
    setOtpError("")
    setHasPassword(false)
    phoneForm.setValue("phone", phone)
  }, [phone, phoneForm])

  function handleOtpComplete(value: string) {
    verifyForm.setValue("code", value)
    verifyForm.handleSubmit(onVerifyOtp)()
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">
            {step === "phone" ? "ورود به توپ‌سِت" : "کد تأیید"}
          </h1>
          <p className="text-sm text-balance text-muted-foreground">
            {step === "phone"
              ? "برای رزرو سالن ورزشی وارد حساب خود شوید"
              : purpose === "password_reset"
                ? `کد ۶ رقمی بازیابی رمز ارسال شده به ${toPersianDigits(phone)} را وارد کنید`
              : `کد ۶ رقمی ارسال شده به ${toPersianDigits(phone)} را وارد کنید`}
          </p>
        </div>

        {/* ── Step 1: Phone input ─────────────────────────────────── */}
        {step === "phone" && (
          <form
            onSubmit={phoneForm.handleSubmit(onSendOtp)}
            className="flex flex-col gap-6"
          >
            <Field>
              <FieldLabel>شماره موبایل</FieldLabel>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                  <HugeiconsIcon
                    icon={AiPhone01Icon}
                    className="size-4 text-muted-foreground"
                  />
                </div>
                <Controller
                  name="phone"
                  control={phoneForm.control}
                  render={({ field }) => (
                    <Input
                      type="tel"
                      dir="ltr"
                      placeholder="مثلاً ۰۹۱۲۰۰۰۰۰۰۰"
                      maxLength={11}
                      className="bg-background pr-8 text-left"
                      autoComplete="tel"
                      value={toPersianDigits(field.value || "")}
                      onChange={(e) =>
                        field.onChange(toEnglishDigits(e.target.value))
                      }
                      onBlur={field.onBlur}
                      ref={field.ref}
                      name={field.name}
                    />
                  )}
                />
              </div>
              <FieldError
                errors={
                  phoneForm.formState.errors.phone
                    ? [phoneForm.formState.errors.phone]
                    : undefined
                }
              />
            </Field>

            <Field>
              <Button
                type="submit"
                className="w-full"
                disabled={sending || !phoneForm.formState.isValid}
              >
                {sending ? <Spinner data-icon="inline-start" /> : null}
                {sending ? "در حال ارسال..." : "ارسال کد تأیید"}
              </Button>
            </Field>
          </form>
        )}

        {/* ── Step 2: Verify OTP ──────────────────────────────────── */}
        {step === "verify" && (
          <form
            onSubmit={verifyForm.handleSubmit(onVerifyOtp)}
            className="flex flex-col gap-6"
          >
            {/* Name field for new users */}
            {isNewUser && (
              <Field>
                <FieldLabel>نام و نام خانوادگی</FieldLabel>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                    <HugeiconsIcon
                      icon={AiUserIcon}
                      className="size-4 text-muted-foreground"
                    />
                  </div>
                  <Controller
                    name="full_name"
                    control={verifyForm.control}
                    render={({ field }) => (
                      <Input
                        type="text"
                        placeholder="مثلاً علی محمدی"
                        className="bg-background pr-8"
                        autoComplete="name"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        name={field.name}
                      />
                    )}
                  />
                </div>
                <FieldError
                  errors={
                    verifyForm.formState.errors.full_name
                      ? [verifyForm.formState.errors.full_name]
                      : undefined
                  }
                />
              </Field>
            )}

            <Field>
              <FieldLabel>کد تأیید</FieldLabel>
              <Controller
                name="code"
                control={verifyForm.control}
                render={({ field }) => (
                  <InputOTP
                    maxLength={6}
                    value={field.value || ""}
                    onChange={(val) => {
                      setOtpError("")
                      field.onChange(val)
                    }}
                    onComplete={handleOtpComplete}
                    disabled={verifying}
                    containerClassName="justify-center"
                    pattern={REGEXP_ONLY_DIGITS}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                )}
              />
              <FieldError
                errors={
                  verifyForm.formState.errors.code
                    ? [verifyForm.formState.errors.code]
                    : undefined
                }
              />
              <FieldError
                className="text-center font-bold"
                errors={otpError ? [{ message: otpError }] : undefined}
              />
            </Field>

            <Field>
              <Button
                type="submit"
                className="w-full"
                disabled={verifying || (codeValue?.length ?? 0) < 6}
              >
                {verifying ? <Spinner data-icon="inline-start" /> : null}
                {verifying
                  ? "در حال تأیید..."
                  : purpose === "password_reset"
                    ? "تأیید و ادامه"
                    : "تأیید و ورود"}
              </Button>
            </Field>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackToPhone}
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                تغییر شماره
              </button>

              {resendTimer > 0 ? (
                <span className="text-sm text-muted-foreground">
                  ارسال مجدد تا {toPersianDigits(String(resendTimer))} ثانیه
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onResendOtp}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  disabled={sending}
                >
                  {sending ? "در حال ارسال..." : "ارسال مجدد کد"}
                </button>
              )}
            </div>
          </form>
        )}

        <FieldDescription className="text-center">
          {step === "verify" && hasPassword && onLoginClick ? (
            <Button
              type="button"
              variant="link"
              onClick={() => onLoginClick(phone)}
            >
              ورود با رمز عبور
            </Button>
          ) : null}
        </FieldDescription>
      </FieldGroup>
    </div>
  )
}

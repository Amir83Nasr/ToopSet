"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  loginSchema,
  otpPhoneSchema,
  type LoginInput,
  type OtpPhoneInput,
} from "@/lib/validations"
import { toEnglishDigits, toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldDescription,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { HugeiconsIcon } from "@hugeicons/react"
import { AiPhone01Icon, AiLockIcon } from "@hugeicons/core-free-icons"
import { toast } from "@/lib/toast"
import { ApiError } from "@/lib/api"
import type { UseAuthReturn } from "@/hooks/use-auth"

interface Props {
  login: UseAuthReturn["login"]
  checkLoginOptions: UseAuthReturn["checkLoginOptions"]
  redirect?: string
  initialPhone?: string
  onRegisterClick?: () => void
  onSuccess?: () => void
}

export function LoginForm({
  login,
  checkLoginOptions,
  redirect,
  initialPhone = "",
  onRegisterClick,
  onSuccess,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState<"phone" | "password">(
    initialPhone ? "password" : "phone"
  )
  const [phone, setPhone] = useState(initialPhone)
  const [checking, setChecking] = useState(false)

  const phoneForm = useForm<OtpPhoneInput>({
    resolver: zodResolver(otpPhoneSchema),
    mode: "onChange",
    defaultValues: { phone: initialPhone },
  })

  const passwordForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { phone: initialPhone, password: "" },
  })
  const phoneValue = phoneForm.watch("phone")

  useEffect(() => {
    passwordForm.setValue("phone", phone)
  }, [passwordForm, phone])

  function otpUrl(mode: "otp_login" | "password_reset") {
    const params = new URLSearchParams()
    params.set("phone", phone)
    params.set("mode", mode)
    if (redirect && mode === "otp_login") params.set("redirect", redirect)
    return `/otp?${params.toString()}`
  }

  async function onPhoneSubmit(data: OtpPhoneInput) {
    setChecking(true)
    try {
      const res = await checkLoginOptions(data)
      setPhone(data.phone)
      passwordForm.setValue("phone", data.phone)
      if (res.has_password) {
        setStep("password")
      } else {
        const params = new URLSearchParams()
        params.set("phone", data.phone)
        params.set("mode", "otp_login")
        if (redirect) params.set("redirect", redirect)
        router.push(`/otp?${params.toString()}`)
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در بررسی شماره")
    } finally {
      setChecking(false)
    }
  }

  async function onSubmit(data: LoginInput) {
    try {
      await login(data, redirect)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در ورود")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup>
        {step === "phone" ? (
          <form
            onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col items-center gap-1 text-center">
              <h1 className="text-2xl font-bold">ورود به توپ‌سِت</h1>
              <p className="text-sm text-balance text-muted-foreground">
                شماره موبایل خود را وارد کنید
              </p>
            </div>

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
                disabled={
                  checking ||
                  !phoneForm.formState.isValid ||
                  (phoneValue?.length ?? 0) !== 11
                }
              >
                {checking ? <Spinner data-icon="inline-start" /> : null}
                {checking ? "در حال بررسی..." : "ادامه"}
              </Button>
            </Field>
          </form>
        ) : (
          <form
            onSubmit={passwordForm.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            <input type="hidden" {...passwordForm.register("phone")} />
            <div className="flex flex-col items-center gap-1 text-center">
              <h1 className="text-2xl font-bold">ورود با رمز عبور</h1>
              <p className="text-sm text-balance text-muted-foreground">
                شماره {toPersianDigits(phone)} رمز عبور دارد
              </p>
            </div>

            <Field>
              <FieldLabel>رمز عبور</FieldLabel>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                  <HugeiconsIcon
                    icon={AiLockIcon}
                    className="size-4 text-muted-foreground"
                  />
                </div>
                <Controller
                  name="password"
                  control={passwordForm.control}
                  render={({ field }) => (
                    <Input
                      type="password"
                      dir="ltr"
                      placeholder="حداقل ۴ کاراکتر"
                      className="bg-background pr-8"
                      autoComplete="current-password"
                      {...field}
                    />
                  )}
                />
              </div>
              <FieldError
                errors={
                  passwordForm.formState.errors.password
                    ? [passwordForm.formState.errors.password]
                    : undefined
                }
              />
            </Field>

            <Field>
              <Button
                type="submit"
                className="w-full"
                disabled={passwordForm.formState.isSubmitting}
              >
                {passwordForm.formState.isSubmitting ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                {passwordForm.formState.isSubmitting ? "در حال ورود..." : "ورود"}
              </Button>
            </Field>

            <div className="flex flex-col items-center gap-2 text-sm sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => router.push(otpUrl("otp_login"))}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                ورود با کد یکبار مصرف
              </button>
              <button
                type="button"
                onClick={() => router.push(otpUrl("password_reset"))}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                فراموشی رمز عبور
              </button>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setStep("phone")
                  phoneForm.setValue("phone", phone)
                }}
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                تغییر شماره
              </button>
            </div>
          </form>
        )}

        <FieldDescription className="text-center">
          حساب کاربری ندارید؟{" "}
          {onRegisterClick ? (
            <Button type="button" variant="link" onClick={onRegisterClick}>
              ثبت‌نام
            </Button>
          ) : (
            <Link
              href={
                redirect
                  ? `/register?redirect=${encodeURIComponent(redirect)}`
                  : "/register"
              }
              className="underline underline-offset-4"
            >
              ثبت‌نام
            </Link>
          )}
        </FieldDescription>
      </FieldGroup>
    </div>
  )
}

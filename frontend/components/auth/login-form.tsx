"use client"

import Link from "next/link"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginInput } from "@/lib/validations"
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
  redirect?: string
  onRegisterClick?: () => void
  onSuccess?: () => void
}

export function LoginForm({
  login,
  redirect,
  onRegisterClick,
  onSuccess,
}: Props) {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { phone: "", password: "" },
  })

  async function onSubmit(data: LoginInput) {
    try {
      await login(data, redirect)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در ورود")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">ورود به توپ‌سِت</h1>
          <p className="text-sm text-balance text-muted-foreground">
            برای رزرو سالن ورزشی وارد حساب خود شوید
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
              control={control}
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
          <FieldError errors={errors.phone ? [errors.phone] : undefined} />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel>رمز عبور</FieldLabel>
            <Link
              href="#"
              className="ms-auto text-sm underline-offset-4 hover:underline"
            >
              فراموش کردم
            </Link>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
              <HugeiconsIcon
                icon={AiLockIcon}
                className="size-4 text-muted-foreground"
              />
            </div>
            <Controller
              name="password"
              control={control}
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
            errors={errors.password ? [errors.password] : undefined}
          />
        </Field>

        <Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            {isSubmitting ? "در حال ورود..." : "ورود"}
          </Button>
        </Field>

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
    </form>
  )
}

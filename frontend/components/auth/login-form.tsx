"use client"

import Link from "next/link"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginInput } from "@/lib/validations"
import { toEnglishDigits, toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import type { UseAuthReturn } from "@/hooks/use-auth"

interface Props {
  login: UseAuthReturn["login"]
  redirect?: string
  onRegisterClick?: () => void
  onSuccess?: () => void
}

export function LoginForm({ login, redirect, onRegisterClick, onSuccess }: Props) {
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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel>شماره موبایل</FieldLabel>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <Input
                type="tel"
                dir="ltr"
                placeholder="09120000000"
                maxLength={11}
                value={toPersianDigits(field.value || "")}
                onChange={(e) => field.onChange(toEnglishDigits(e.target.value))}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
          <FieldError errors={errors.phone ? [errors.phone] : undefined} />
        </Field>

        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel>رمز عبور</FieldLabel>
            <Link
              href="#"
              className="text-[11px] text-muted-foreground underline-offset-4 hover:underline"
            >
              فراموش کردم
            </Link>
          </div>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input
                type="password"
                dir="ltr"
                placeholder="......"
                {...field}
              />
            )}
          />
          <FieldError errors={errors.password ? [errors.password] : undefined} />
        </Field>
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
        {isSubmitting ? "در حال ورود..." : "ورود"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        حساب کاربری ندارید؟{" "}
        {onRegisterClick ? (
          <button
            type="button"
            onClick={onRegisterClick}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            ثبت‌نام
          </button>
        ) : (
          <Link
            href="/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            ثبت‌نام
          </Link>
        )}
      </p>
    </form>
  )
}

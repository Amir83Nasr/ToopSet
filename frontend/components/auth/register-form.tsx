"use client"

import Link from "next/link"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerSchema, type RegisterInput } from "@/lib/validations"
import { toEnglishDigits, toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import type { UseAuthReturn } from "@/hooks/use-auth"

interface Props {
  register: UseAuthReturn["register"]
  onLoginClick?: () => void
  onSuccess?: () => void
}

export function RegisterForm({ register: registerFn, onLoginClick, onSuccess }: Props) {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: { full_name: "", phone: "", password: "" },
  })

  async function onSubmit(data: RegisterInput) {
    try {
      await registerFn(data)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در ثبت‌نام")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="text-center">
        <h1 className="text-base font-bold">ساخت حساب کاربری</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          برای ثبت‌نام اطلاعات زیر را وارد کنید
        </p>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel>نام و نام خانوادگی</FieldLabel>
          <Controller
            name="full_name"
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                placeholder="مثلاً علی محمدی"
                {...field}
              />
            )}
          />
          <FieldError errors={errors.full_name ? [errors.full_name] : undefined} />
        </Field>

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
                className="text-left"
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
          <FieldLabel>رمز عبور</FieldLabel>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input
                type="password"
                dir="ltr"
                placeholder="حداقل ۴ کاراکتر"
                {...field}
              />
            )}
          />
          <FieldError errors={errors.password ? [errors.password] : undefined} />
        </Field>
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
        {isSubmitting ? "در حال ثبت‌نام..." : "ثبت‌نام"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        قبلاً ثبت‌نام کرده‌اید؟{" "}
        {onLoginClick ? (
          <button
            type="button"
            onClick={onLoginClick}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            ورود
          </button>
        ) : (
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            ورود
          </Link>
        )}
      </p>
    </form>
  )
}

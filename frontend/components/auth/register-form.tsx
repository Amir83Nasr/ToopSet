"use client"

import Link from "next/link"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerSchema, type RegisterInput } from "@/lib/validations"
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
import {
  AiUserIcon,
  AiPhone01Icon,
  AiLockIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "@/lib/toast"
import { ApiError } from "@/lib/api"
import type { UseAuthReturn } from "@/hooks/use-auth"

interface Props {
  register: UseAuthReturn["register"]
  redirect?: string
  onLoginClick?: () => void
  onSuccess?: () => void
}

export function RegisterForm({
  register: registerFn,
  redirect,
  onLoginClick,
  onSuccess,
}: Props) {
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
      await registerFn(data, redirect)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در ثبت‌نام")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">ایجاد حساب کاربری</h1>
          <p className="text-sm text-balance text-muted-foreground">
            ثبت‌نام رایگان و رزرو آسان سالن‌های ورزشی
          </p>
        </div>

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
              control={control}
              render={({ field }) => (
                <Input
                  type="text"
                  placeholder="مثلاً علی محمدی"
                  className="bg-background pr-8"
                  autoComplete="name"
                  {...field}
                />
              )}
            />
          </div>
          <FieldError
            errors={errors.full_name ? [errors.full_name] : undefined}
          />
        </Field>

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
                  className="bg-background pr-8 text-left"
                  maxLength={11}
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
              control={control}
              render={({ field }) => (
                <Input
                  type="password"
                  dir="ltr"
                  placeholder="حداقل ۴ کاراکتر"
                  className="bg-background pr-8"
                  autoComplete="new-password"
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
            {isSubmitting ? "در حال ثبت‌نام..." : "ثبت‌نام"}
          </Button>
        </Field>

        <FieldDescription className="text-center">
          قبلاً ثبت‌نام کرده‌اید؟{" "}
          {onLoginClick ? (
            <Button type="button" variant="link" onClick={onLoginClick}>
              ورود
            </Button>
          ) : (
            <Link href="/login" className="underline underline-offset-4">
              ورود
            </Link>
          )}
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}

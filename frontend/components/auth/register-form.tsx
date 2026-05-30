"use client"

import Link from "next/link"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerSchema, type RegisterInput } from "@/lib/validations"
import { cn, toEnglishDigits, toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import type { UseAuthReturn } from "@/hooks/use-auth"

interface Props extends React.ComponentProps<"form"> {
  register: UseAuthReturn["register"]
}

export function RegisterForm({
  register: registerFn,
  className,
  ...props
}: Props) {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  })

  async function onSubmit(data: RegisterInput) {
    try {
      await registerFn(data)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "خطا در ثبت‌نام"
      toast.error(message)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">ایجاد حساب کاربری</h1>
          <p className="text-sm text-balance text-muted-foreground">
            برای ثبت‌نام اطلاعات زیر را وارد کنید
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="fullName">نام و نام خانوادگی</FieldLabel>
          <Controller
            name="full_name"
            control={control}
            render={({ field }) => (
              <Input
                id="fullName"
                type="text"
                placeholder="مثلاً علی محمدی"
                className="bg-background"
                {...field}
              />
            )}
          />
          {errors.full_name && (
            <p className="text-sm text-destructive">
              {errors.full_name.message}
            </p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="phone">شماره موبایل</FieldLabel>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <Input
                id="phone"
                type="tel"
                dir="ltr"
                placeholder="09120000000"
                className="bg-background text-left"
                maxLength={11}
                value={toPersianDigits(field.value || "")}
                onChange={(e) => {
                  field.onChange(toEnglishDigits(e.target.value))
                }}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="password">رمز عبور</FieldLabel>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input
                id="password"
                type="password"
                dir="ltr"
                placeholder="حداقل ۴ کاراکتر"
                className="bg-background"
                {...field}
              />
            )}
          />
          {errors.password && (
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </Field>

        <Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "در حال ثبت‌نام..." : "ثبت‌نام"}
          </Button>
          <FieldDescription className="text-center">
            قبلاً ثبت‌نام کرده‌اید؟{" "}
            <Link href="/login" className="underline underline-offset-4">
              ورود
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}

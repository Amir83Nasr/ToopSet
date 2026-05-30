"use client"

import Link from "next/link"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginInput } from "@/lib/validations"
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
  login: UseAuthReturn["login"]
  redirect?: string
}

export function LoginForm({ login, redirect, className, ...props }: Props) {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  })

  async function onSubmit(data: LoginInput) {
    try {
      await login(data, redirect)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "خطا در ورود"
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
          <h1 className="text-2xl font-bold">به توپ‌سِت خوش آمدید</h1>
          <p className="text-sm text-balance text-muted-foreground">
            برای ورود شماره موبایل خود را وارد کنید
          </p>
        </div>

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
          <div className="flex items-center">
            <FieldLabel htmlFor="password">رمز عبور</FieldLabel>
            <Link
              href="#"
              className="mr-auto text-sm underline-offset-4 hover:underline"
            >
              رمز را فراموش کرده‌اید؟
            </Link>
          </div>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input
                id="password"
                type="password"
                dir="ltr"
                placeholder="......"
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
            {isSubmitting ? "در حال ورود..." : "ورود"}
          </Button>
          <FieldDescription className="text-center">
            حساب کاربری ندارید؟{" "}
            <Link href="/register" className="underline underline-offset-4">
              ثبت‌نام
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}

"use client"

import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import { registerSchema, type RegisterInput } from "@/lib/validations"
import type { UseAuthReturn } from "@/hooks/use-auth"

interface Props {
  register: UseAuthReturn["register"]
}

export function RegisterForm({ register: registerFn }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
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
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">ثبت‌نام</CardTitle>
        <CardDescription>با شماره موبایل ثبت‌نام کنید</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">نام و نام خانوادگی</Label>
            <Input
              id="fullName"
              placeholder="مثلاً علی محمدی"
              {...register("full_name")}
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">
                {errors.full_name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">شماره موبایل</Label>
            <Input
              id="phone"
              type="tel"
              dir="ltr"
              placeholder="09120000000"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">رمز عبور</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              placeholder="حداقل ۴ کاراکتر"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "در حال ثبت‌نام..." : "ثبت‌نام"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            قبلاً ثبت‌نام کرده‌اید؟{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline underline-offset-4"
            >
              ورود
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

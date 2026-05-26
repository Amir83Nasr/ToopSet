"use client"

import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginInput } from "@/lib/validations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import type { UseAuthReturn } from "@/hooks/use-auth"

interface Props {
  login: UseAuthReturn["login"]
}

export function LoginForm({ login }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    try {
      await login(data)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "خطا در ورود"
      toast.error(message)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">ورود</CardTitle>
        <CardDescription>با شماره موبایل و رمز عبور وارد شوید</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              placeholder="......"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "در حال ورود..." : "ورود"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            حساب کاربری ندارید؟{" "}
            <Link
              href="/register"
              className="font-medium text-primary underline underline-offset-4"
            >
              ثبت‌نام
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

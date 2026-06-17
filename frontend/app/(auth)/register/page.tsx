"use client"

import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { RegisterForm } from "@/components/auth/register-form"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function RegisterPage() {
  const { register } = useAuth()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || undefined

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowRight className="ml-2 size-4" />
              بازگشت به صفحه اصلی
            </Link>
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <RegisterForm register={register} redirect={redirect} />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/futsal.svg"
          alt=""
          fill
          className="absolute inset-0 size-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}

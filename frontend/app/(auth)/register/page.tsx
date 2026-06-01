"use client"

import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  const { register } = useAuth()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-b from-background to-muted/50 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <Image
          src="/favicon.svg"
          alt="توپ‌سِت"
          width={28}
          height={28}
          className="size-7"
        />
        <span className="text-lg font-bold tracking-tight">توپ‌سِت</span>
      </Link>

      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <RegisterForm register={register} />
      </div>
    </div>
  )
}

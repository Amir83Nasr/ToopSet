"use client"

import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  const { register } = useAuth()

  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_2fr]">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <Image
              src="/favicon.svg"
              alt="توپ‌سِت"
              width={24}
              height={24}
              className="size-6"
            />
            توپ‌سِت
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <RegisterForm register={register} />
          </div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden lg:block">
        <Image
          src="/futsal.svg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-br from-black/30 to-transparent" />
      </div>
    </div>
  )
}

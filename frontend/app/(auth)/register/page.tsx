"use client"

import { useAuth } from "@/hooks/use-auth"
import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  const { register } = useAuth()
  return <RegisterForm register={register} />
}

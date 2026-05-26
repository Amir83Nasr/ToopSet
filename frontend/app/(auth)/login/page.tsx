"use client"

import { useAuth } from "@/hooks/use-auth"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  const { login } = useAuth()
  return <LoginForm login={login} />
}

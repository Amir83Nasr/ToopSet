"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { LoginForm } from "@/components/auth/login-form"

function LoginPageContent() {
  const { login } = useAuth()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || undefined
  return <LoginForm login={login} redirect={redirect} />
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}

"use client"

import { useState } from "react"
import Link from "next/link"
import { Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RegisterComplexDialog } from "@/components/public/register-complex-dialog"
import { useAuth } from "@/hooks/use-auth"

// Landing-page banner inviting sports-complex owners to request manager access.
// Visible to visitors and regular users; hidden for manager/admin who already
// hold the access.
export function OwnerCtaSection() {
  const { user } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)

  if (user && user.role !== "user") return null

  const canSubmit = !!user && user.role === "user"

  return (
    <section id="owner-cta-section">
      <div className="mx-auto max-w-7xl px-4 pb-16 md:pb-20">
        <div className="animate-fade-in mx-auto max-w-2xl rounded-3xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 text-center md:p-8">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Building2 className="size-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">
            صاحب مجموعه ورزشی هستید؟
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">
            درخواست دسترسی مدیر مجموعه بدهید تا بتوانید مجموعه ورزشی خود را در
            توپ‌سِت ثبت کنید و سانس‌هایتان را آنلاین رزرو بپذیرید.
          </p>
          <div className="mt-6 flex justify-center">
            {canSubmit ? (
              <Button
                size="lg"
                onClick={() => setDialogOpen(true)}
                className="h-10 rounded-lg px-6 text-base font-semibold"
              >
                <Building2 className="size-5 shrink-0" />
                ثبت مجموعه ورزشی
              </Button>
            ) : (
              <Button
                size="lg"
                asChild
                className="h-10 rounded-lg px-6 text-base font-semibold"
              >
                <Link href="/login">
                  <Building2 className="size-5 shrink-0" />
                  ثبت مجموعه ورزشی
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <RegisterComplexDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  )
}

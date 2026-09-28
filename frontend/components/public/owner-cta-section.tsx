"use client"

import { useState } from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Store01Icon,
  CalendarCheckIn01Icon,
  ChartUpIcon,
  ArrowLeft01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { RegisterComplexDialog } from "@/components/public/register-complex-dialog"
import { useAuth } from "@/hooks/use-auth"

// ── DATA ─────────────────────────────────────────────────────────────────────

const benefits = [
  {
    icon: Store01Icon,
    title: "ثبت مجموعه",
    text: "مجموعه ورزشی خود را در توپ‌سِت ثبت کنید",
  },
  {
    icon: CalendarCheckIn01Icon,
    title: "رزرو آنلاین",
    text: "سانس‌هایتان را آنلاین رزرو بپذیرید",
  },
  {
    icon: ChartUpIcon,
    title: "مدیریت سانس‌ها",
    text: "ظرفیت، رزروها و درآمد را یکجا ببینید",
  },
] as const

// ── COMPONENT ────────────────────────────────────────────────────────────────

export function OwnerCtaSection() {
  const { user } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)

  if (user && user.role !== "user") return null

  const canSubmit = !!user && user.role === "user"

  const cta = canSubmit ? (
    <Button
      size="lg"
      onClick={() => setDialogOpen(true)}
      className="h-10 rounded-lg px-6 text-base font-semibold"
    >
      ثبت مجموعه ورزشی
      <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
    </Button>
  ) : (
    <Button size="lg" asChild className="px-10">
      <Link href="/login">
        ثبت مجموعه ورزشی
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
      </Link>
    </Button>
  )

  return (
    <section id="owner-cta-section" className="py-14 md:py-20">
      <div className="mx-auto max-w-[1120px] px-4 md:px-6">
        {/* Section head */}
        <ScrollReveal>
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
            <span className="inline-block rounded-[8px] border border-primary/18 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              برای مدیران مجموعه
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-4xl">
              صاحب مجموعه ورزشی هستید؟
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              درخواست دسترسی مدیر مجموعه بدهید تا بتوانید مجموعه ورزشی خود را در
              توپ‌سِت ثبت کنید و سانس‌هایتان را آنلاین رزرو بپذیرید.
            </p>
          </div>
        </ScrollReveal>

        {/* CTA card */}
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm md:p-10">
            {/* Corner glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(480px 140px at 50% 0%, var(--color-primary) 8%, transparent 70%)",
                opacity: 0.07,
              }}
            />
            <div className="relative">
              <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-xl border border-primary/18 bg-primary/6 text-primary">
                <HugeiconsIcon icon={Store01Icon} strokeWidth={1.75} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {benefits.map(({ icon: Icon, title, text }) => (
                  <div
                    key={title}
                    className="flex items-center gap-3 rounded-2xl border bg-card/50 p-4 text-start"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <HugeiconsIcon icon={Icon} strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {title}
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-center">{cta}</div>
            </div>
          </div>
        </ScrollReveal>
      </div>

      <RegisterComplexDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  )
}

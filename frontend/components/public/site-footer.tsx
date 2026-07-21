"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Phone, Mail, MessageCircle, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getApiBase } from "@/lib/api"

// ── Data ───────────────────────────────────────────────────────────────────

const API_BASE = getApiBase()

interface ContactInfo {
  support_phone?: string
  support_email?: string
  messenger_id?: string
}

const quickLinks = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/vendors", label: "جستجوی سالن‌ها" },
  { href: "/contact", label: "ارتباط با ما" },
]

const pageLinks = [
  { href: "/terms", label: "قوانین و مقررات" },
  { href: "/privacy", label: "حریم خصوصی" },
]

// ── Component ──────────────────────────────────────────────────────────────

export function SiteFooter() {
  const [contact, setContact] = useState<ContactInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/api/v1/settings/public/contact`)
      .then((res) => {
        if (res.ok && !cancelled) res.json().then(setContact)
      })
      .catch(() => {}) // swallow — static fallback shown below
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <footer className="pb-safe relative overflow-hidden border-t bg-background max-md:pb-4">
      <div className="px-safe relative mx-auto max-w-7xl px-4">
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-lg font-bold"
            >
              <span>توپ‌سِت</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              سامانه هوشمند رزرو آنلاین مجموعه‌های ورزشی. به راحتی سالن مورد نظر
              خود را پیدا کنید و سانس دلخواه را رزرو نمایید.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-[10px] text-muted-foreground/60">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              آنلاین — ۲۴ ساعته
            </div>
          </div>

          {/* Pages */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">صفحات</h4>
            <ul className="space-y-2.5">
              {pageLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">لینک‌های سریع</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">ارتباط با ما</h4>
            <ul className="space-y-3">
              {contact?.support_phone && (
                <li>
                  <a
                    href={`tel:${contact.support_phone}`}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Phone className="size-4 shrink-0 text-primary/60" />
                    <span>{contact.support_phone}</span>
                  </a>
                </li>
              )}
              {contact?.support_email && (
                <li>
                  <a
                    href={`mailto:${contact.support_email}`}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Mail className="size-4 shrink-0 text-primary/60" />
                    <span dir="ltr">{contact.support_email}</span>
                  </a>
                </li>
              )}
              {contact?.messenger_id && (
                <li>
                  <a
                    href={`https://ble.ir/${contact.messenger_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <MessageCircle className="size-4 shrink-0 text-primary/60" />
                    <span>{contact.messenger_id}</span>
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pb-safe mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            تمامی حقوق مادی و معنوی این وبسایت متعلق به توپ‌سِت می‌باشد.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (typeof document !== "undefined") {
                const root = document.getElementById("toopset-root")
                root?.scrollTo({ top: 0, behavior: "smooth" })
              }
            }}
            aria-label="بازگشت به بالا"
            className="text-xs text-muted-foreground hover:gap-2 hover:text-foreground"
          >
            <ArrowUp className="size-3.5" />
            بازگشت به بالا
          </Button>
        </div>
      </div>
    </footer>
  )
}

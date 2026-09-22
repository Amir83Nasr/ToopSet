"use client"

import { useEffect, useState } from "react"
import { Phone, Mail, MessageCircle } from "lucide-react"
import { getApiBase } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"

// مقادیر پیش‌فرض تا وقتی ادمین هنوز تنظیماتی ذخیره نکرده
const DEFAULT_SUPPORT_PHONE = "09306853363"
const DEFAULT_SUPPORT_EMAIL = "amirhossein.nasrollahi.main@gmail.com"
const DEFAULT_MESSENGER_ID = "Amir83Nasr"

const API_BASE = getApiBase()

interface ContactInfo {
  support_phone?: string
  support_email?: string
  messenger_id?: string
}

export function FooterContact() {
  const [contact, setContact] = useState<ContactInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchContact = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/settings/public/contact`)
        if (res.ok && !cancelled) setContact(await res.json())
      } catch {
        // swallow — fallback defaults remain
      }
    }
    const timer = setTimeout(() => fetchContact(), 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  const supportPhone = contact?.support_phone || DEFAULT_SUPPORT_PHONE
  const supportEmail = contact?.support_email || DEFAULT_SUPPORT_EMAIL
  const messengerId = contact?.messenger_id || DEFAULT_MESSENGER_ID

  return (
    <ul className="space-y-3">
      <li>
        <a
          href={`tel:${supportPhone}`}
          className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Phone className="size-4 shrink-0 text-primary/60" />
          <span>{toPersianDigits(supportPhone)}</span>
        </a>
      </li>
      <li>
        <a
          href={`mailto:${supportEmail}`}
          className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Mail className="size-4 shrink-0 text-primary/60" />
          <span dir="ltr">{supportEmail}</span>
        </a>
      </li>
      {messengerId && (
        <li>
          <a
            href={`https://ble.ir/${messengerId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <MessageCircle className="size-4 shrink-0 text-primary/60" />
            <span>{messengerId}</span>
          </a>
        </li>
      )}
    </ul>
  )
}

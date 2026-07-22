"use client"

import { useEffect, useState } from "react"
import { Phone, Mail, MessageCircle } from "lucide-react"
import { getApiBase } from "@/lib/api"

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
    fetch(`${API_BASE}/api/v1/settings/public/contact`)
      .then((res) => {
        if (res.ok && !cancelled) res.json().then(setContact)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
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
  )
}

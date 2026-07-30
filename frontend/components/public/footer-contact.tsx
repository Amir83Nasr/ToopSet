import { Phone, Mail, MessageCircle } from "lucide-react"
import { toPersianDigits } from "@/lib/utils"

const supportPhone = "09306853363"
const supportEmail = "amirhossein.nasrollahi.main@gmail.com"
const messengerId = "Amir83Nasr"

export function FooterContact() {
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

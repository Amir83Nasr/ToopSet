import Link from "next/link"
import Image from "next/image"
import { Building2, MapPin, Star } from "lucide-react"

import { Card } from "@/components/ui/card"
import { buildVendorImageUrl } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
export interface Vendor {
  id: number
  name: string
  sport_types: string[]
  address: string
  latitude: number
  longitude: number
  capacity: number
  is_active: boolean
  average_rating: number
  base_price: number | null
  images?: string[]
  main_image?: string | null
}

function formatPrice(price: number | null): string {
  if (price == null) return "—"
  const formattedNumber = new Intl.NumberFormat("fa-IR", {
    useGrouping: true,
  })
    .format(price)
    .replace(/,/g, "٬")
  return `${formattedNumber} تومان`
}

/** Shared vendor card — image hero + rating badge + bottom overlay (name, address, price). */
export function VendorCard({
  vendor,
  priority = false,
}: {
  vendor: Vendor
  priority?: boolean
}) {
  const mainImage = vendor.main_image || vendor.images?.[0]
  const rating =
    vendor.average_rating > 0 ? vendor.average_rating.toFixed(1) : null

  return (
    <Link href={`/vendors/${vendor.id}`} className="group block">
      <Card className="gap-0 overflow-hidden rounded-[1.25rem] border-0 bg-card p-0 shadow-sm ring-0 transition-shadow duration-300 ease-out group-hover:shadow-xl">
        {/* ── Image hero ── */}
        <div className="relative aspect-16/11 overflow-hidden bg-muted">
          {mainImage ? (
            <Image
              src={buildVendorImageUrl(mainImage)}
              alt={`عکس اصلی ${vendor.name}`}
              fill
              priority={priority}
              loading={priority ? undefined : "lazy"}
              className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Building2 className="size-10 text-muted-foreground/40" />
            </div>
          )}

          {/* Bottom gradient for text legibility */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />

          {/* Rating badge */}
          {rating && (
            <div className="absolute start-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white shadow-md backdrop-blur-sm">
              <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
              <span className="tabular-nums">{toPersianDigits(rating)}</span>
            </div>
          )}

          {/* Name + address + price overlayed on image */}
          <div className="absolute inset-x-0 bottom-0 z-10 p-4">
            <h3 className="text-base leading-snug font-bold text-white drop-shadow-sm">
              {vendor.name}
            </h3>
            <p className="mt-1.5 flex items-center gap-1 text-xs text-white/75">
              <MapPin className="size-3.5 shrink-0" />
              <span className="line-clamp-1">{vendor.address}</span>
            </p>

            {/* Price — minimum slot price */}
            {vendor.base_price != null && (
              <div className="mt-3 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 backdrop-blur-md">
                <div className="flex items-center justify-center gap-1">
                  <span className="inline-flex items-center rounded bg-white/15 px-1 py-0.5 text-[11px] leading-none font-semibold text-white">
                    شروع قیمت از
                  </span>
                  <span className="text-sm font-bold text-white">
                    {formatPrice(vendor.base_price)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}

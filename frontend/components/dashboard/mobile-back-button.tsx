"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Back-to-account button — visible only on mobile (md:hidden).
 * Place it alongside the Refresh button in each dashboard page header.
 */
export function MobileBackButton() {
  return (
    <Button variant="outline" asChild className="md:hidden">
      <Link href="/account">
        <ChevronRight className="me-1 size-4" />
        بازگشت
      </Link>
    </Button>
  )
}

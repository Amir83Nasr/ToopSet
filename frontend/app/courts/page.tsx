import { redirect } from "next/navigation"

export default function LegacyVendorsRedirectPage() {
  redirect("/vendors")
}

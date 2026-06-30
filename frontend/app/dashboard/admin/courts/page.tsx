import { redirect } from "next/navigation"

export default function AdminLegacyVendorsRedirectPage() {
  redirect("/dashboard/admin/vendors")
}

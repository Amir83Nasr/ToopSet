import { redirect } from "next/navigation"

export default function DashboardCreateLegacyVendorRedirectPage() {
  redirect("/dashboard/vendors/create")
}

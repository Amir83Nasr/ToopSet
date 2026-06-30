import { redirect } from "next/navigation"

export default async function DashboardLegacyVendorRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/dashboard/vendors/${id}`)
}

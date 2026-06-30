import { redirect } from "next/navigation"

export default async function LegacyVendorRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/vendors/${id}`)
}

import { getVendorDetail, getVendorReviews } from "./vendor-loader"
import PublicVendorDetailPage from "./vendor-detail-client"

export default async function VendorDetailServerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [vendor, { reviews, total }] = await Promise.all([
    getVendorDetail(id),
    getVendorReviews(id),
  ])

  return (
    <PublicVendorDetailPage
      initialVendor={vendor ?? undefined}
      initialReviews={reviews}
      initialReviewsTotal={total}
    />
  )
}

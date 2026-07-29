const ENAMAD_TRUST_SEAL =
  "<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=673428&Code=ekzX6bwmZGRNbMheCZrZPg0VXcSWcvTL'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=673428&Code=ekzX6bwmZGRNbMheCZrZPg0VXcSWcvTL' alt='' style='cursor:pointer' code='ekzX6bwmZGRNbMheCZrZPg0VXcSWcvTL'></a>"

export function EnamadTrustSeal() {
  return (
    <div
      className="shrink-0 rounded-xl border bg-white p-2 shadow-sm"
      aria-label="نماد اعتماد الکترونیکی توپ‌ست"
      dangerouslySetInnerHTML={{ __html: ENAMAD_TRUST_SEAL }}
    />
  )
}

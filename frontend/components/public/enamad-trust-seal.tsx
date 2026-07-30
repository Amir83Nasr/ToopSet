const ENAMAD_URL =
  "https://trustseal.enamad.ir/?id=673428&Code=ekzX6bwmZGRNbMheCZrZPg0VXcSWcvTL"
const ENAMAD_LOGO_URL =
  "https://trustseal.enamad.ir/logo.aspx?id=673428&Code=ekzX6bwmZGRNbMheCZrZPg0VXcSWcvTL"

export function EnamadTrustSeal() {
  return (
    <a
      href={ENAMAD_URL}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="origin"
      aria-label="مشاهده اعتبار نماد اعتماد الکترونیکی توپ‌ست"
      className="inline-flex align-middle transition-opacity hover:opacity-80"
    >
      {/* Enamad validates the browser origin, so this must not use Next's image proxy. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ENAMAD_LOGO_URL}
        alt="نماد اعتماد الکترونیکی توپ‌ست"
        width={125}
        height={136}
        referrerPolicy="origin"
        className="h-24 w-auto object-contain"
      />
    </a>
  )
}

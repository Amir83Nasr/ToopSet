const ENAMAD_URL =
  "https://trustseal.enamad.ir/?id=673428&Code=ekzX6bwmZGRNbMheCZrZPg0VXcSWcvTL"

export function EnamadTrustSeal() {
  return (
    <a
      href={ENAMAD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
    >
      نماد اعتماد الکترونیکی
    </a>
  )
}

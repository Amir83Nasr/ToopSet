const ENAMAD_URL =
  "https://trustseal.enamad.ir/?id=673428&Code=ekzX6bwmZGRNbMheCZrZPg0VXcSWcvTL"
const ENAMAD_LOGO_URL =
  "https://trustseal.enamad.ir/logo.aspx?id=673428&Code=ekzX6bwmZGRNbMheCZrZPg0VXcSWcvTL"
const ENAMAD_CODE = "ekzX6bwmZGRNbMheCZrZPg0VXcSWcvTL"

export function EnamadTrustSeal() {
  return (
    <a referrerPolicy="origin" href={ENAMAD_URL} target="_blank">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        referrerPolicy="origin"
        src={ENAMAD_LOGO_URL}
        alt=""
        style={{ cursor: "pointer" }}
        {...{ code: ENAMAD_CODE }}
      />
    </a>
  )
}

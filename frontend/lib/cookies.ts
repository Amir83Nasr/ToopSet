// In production the frontend (toopset.ir) and backend (api.toopset.ir) are on
// different origins (cross-site). Cookies sent to a cross-origin API endpoint
// must be Secure + SameSite=None. In local dev we use Lax so http:// works.
function getCookieOptions(): string {
  if (typeof window === "undefined") return "; path=/; SameSite=Lax"
  const isProduction =
    window.location.protocol === "https:" &&
    !["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
  return isProduction
    ? "; path=/; SameSite=None; Secure"
    : "; path=/; SameSite=Lax"
}

export function setCookie(name: string, value: string, days: number = 7) {
  if (typeof document === "undefined") return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}${getCookieOptions()}`
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match ? decodeURIComponent(match[2]) : null
}

export function removeCookie(name: string) {
  if (typeof document === "undefined") return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${getCookieOptions()}`
}

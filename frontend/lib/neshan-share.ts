/**
 * Neshan short share-link (nshn.ir) generation.
 *
 * The Neshan web map encodes a coordinate + zoom into an opaque 12-char hash
 * entirely client-side (no API call), then serves it under https://nshn.ir/.
 * Algorithm reverse-engineered from the neshan.org/maps bundle
 * (encodeShareHash): two 32-bit ints (lat*1e7, lng*1e7, unsigned) packed with
 * a "00" prefix → 66 bits → 11 base-64 chars, prefixed by the base-64 zoom.
 */

const ALPHABET =
  "Ybc8eEghPHkX_ZoS2rs7Qv1fWLAC5BxFGjdJV-M4OiuRpTz9ylan0wq3ND6tIKmU"

/**
 * Build a short Neshan share link for a coordinate, e.g.
 * `https://nshn.ir/rb1JjKpJxD9n`.
 */
export function buildNeshanShareUrl(
  lat: number,
  lng: number,
  zoom = 15
): string {
  return `https://nshn.ir/${encodeShareHash(lat, lng, zoom)}`
}

function encodeShareHash(lat: number, lng: number, zoom: number): string {
  const latBits = ((lat * 10 ** 7) >>> 0).toString(2).padStart(32, "0")
  const lngBits = ((lng * 10 ** 7) >>> 0).toString(2).padStart(32, "0")
  const bits = `00${latBits}${lngBits}`

  let hash = ""
  for (let i = 0; i < bits.length; i += 6) {
    hash += ALPHABET[parseInt(bits.slice(i, i + 6), 2)]
  }
  return ALPHABET[zoom] + hash
}

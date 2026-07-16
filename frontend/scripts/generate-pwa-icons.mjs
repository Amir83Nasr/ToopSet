// ── PWA Icon Generator ─────────────────────────────────────────────────────────
// Usage:  node scripts/generate-pwa-icons.mjs
//         pnpm generate-pwa-icons
//
// Generates PNG icons of required sizes from the favicon SVG source.
// Icons are written to public/icons/ as referenced in config/pwa.ts.
//
// Dependencies: sharp (dev dependency)

import sharp from "sharp"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const PUBLIC_ICONS = resolve(ROOT, "public/icons")
const SVG_SOURCE = resolve(PUBLIC_ICONS, "favicon.svg")

// Sizes required for PWA + Apple touch icon
const SIZES = [
  { name: "icon-192x192.png", size: 192 },
  { name: "icon-512x512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
]

async function main() {
  const svgBuffer = readFileSync(SVG_SOURCE)
  console.log(`Source: ${SVG_SOURCE}`)
  console.log(`Source size: ${(svgBuffer.byteLength / 1024).toFixed(1)} KB\n`)

  for (const { name, size } of SIZES) {
    const outPath = resolve(PUBLIC_ICONS, name)
    await sharp(svgBuffer).resize(size, size).png().toFile(outPath)
    console.log(`  ✓ ${name}  ${size}×${size}`)
  }

  console.log("\nDone — all icons generated in public/icons/")
}

main().catch((err) => {
  console.error("Icon generation failed:", err)
  process.exit(1)
})

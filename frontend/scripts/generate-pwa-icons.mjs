// ── PWA Icon Generator ─────────────────────────────────────────────────────────
// Usage:  node scripts/generate-pwa-icons.mjs
//         pnpm generate-pwa-icons
//
// Generates PNG icons of required sizes from the logo.jpg source.
// Icons are written to public/icons/ as referenced in config/pwa.ts.
//
// Dependencies: sharp (dev dependency)

import sharp from "sharp"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const PUBLIC_ICONS = resolve(ROOT, "public/icons")
const JPG_SOURCE = resolve(PUBLIC_ICONS, "logo.jpg")

// Sizes required for PWA + Apple touch icon.
// maskable needs padding so key art survives the OS safe-zone crop —
// logo.jpg is full-bleed, so pad 10% with white before resizing.
const SIZES = [
  { name: "logo.png", size: 192, pad: false },
  { name: "logo.png", size: 512, pad: false },
  { name: "logo.png", size: 512, pad: true },
  { name: "logo.png", size: 180, pad: false },
]

async function main() {
  const meta = await sharp(JPG_SOURCE).metadata()
  console.log(`Source: ${JPG_SOURCE}`)
  console.log(`Source size: ${meta.width}×${meta.height}\n`)

  for (const { name, size, pad } of SIZES) {
    const outPath = resolve(PUBLIC_ICONS, name)
    let pipeline = sharp(JPG_SOURCE)
    if (pad) {
      const padPx = Math.round((meta.width ?? 1024) * 0.1)
      pipeline = pipeline.extend({
        top: padPx,
        bottom: padPx,
        left: padPx,
        right: padPx,
        background: "#ffffff",
      })
    }
    await pipeline.resize(size, size).png().toFile(outPath)
    console.log(`  ✓ ${name}  ${size}×${size}`)
  }

  console.log("\nDone — all icons generated in public/icons/")
}

main().catch((err) => {
  console.error("Icon generation failed:", err)
  process.exit(1)
})

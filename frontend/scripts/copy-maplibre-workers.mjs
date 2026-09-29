// Copies MapLibre worker bundles into public/ so @amir83nasr/map can
// load them at runtime via setupQomPickWorker("/maplibre/...").
// Runs on postinstall / predev / prebuild — see package.json.
// ponytail: if maplibre-gl moves the workers, resolve the package dir
// with createRequire(import.meta.url).resolve("maplibre-gl/package.json").
import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const src = resolve(root, "node_modules/maplibre-gl/dist")
const dest = resolve(root, "public/maplibre")
const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]

mkdirSync(dest, { recursive: true })
for (const file of files) {
  const from = resolve(src, file)
  if (!existsSync(from)) {
    console.warn(
      `[copy:map-workers] missing ${from} — is maplibre-gl installed?`
    )
    continue
  }
  copyFileSync(from, resolve(dest, file))
  console.log(`[copy:map-workers] public/maplibre/${file}`)
}

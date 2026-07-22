// Dev-mode only: stub that unregisters any stale SW from a prior prod build.
// In production, serwist/next intercepts /sw.js via its route handler before
// Next.js static-file serving runs, so this file is never reached in prod.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", () => {
  self.registration.unregister().then(() =>
    self.clients.matchAll().then((clients) =>
      clients.forEach((c) => c.navigate(c.url))
    )
  )
})

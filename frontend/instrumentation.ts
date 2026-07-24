import { z } from "zod";

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Zod checks whether `new Function("")` is supported.
    // This causes CSP issues when `unsafe-eval` is disabled.
    // Setting `jitless: true` globally skips the eval check entirely.
    if (typeof z?.config === 'function') {
      z.config({ jitless: true });
    }
  }
}

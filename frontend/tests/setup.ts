import "@testing-library/jest-dom/vitest"
import "./mocks/next-link"
import "./mocks/next-navigation"
import "./mocks/next-image"
import "./mocks/next-themes"
import "./mocks/use-auth"
import "./mocks/toast"
import "./mocks/hugeicons"
import "./mocks/api"

// jsdom does not implement matchMedia, while responsive production
// components subscribe to it through useMobile(). Keep the mock behaviorally
// complete enough for add/removeEventListener and legacy listeners.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

// Mock ResizeObserver for Radix UI primitives in jsdom environment
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

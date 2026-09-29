import { readFileSync } from "node:fs"
import path from "node:path"
import { renderHook } from "@testing-library/react"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  document.documentElement.style.overflow = ""
  document.documentElement.style.paddingInlineStart = ""
  document.documentElement.style.paddingInlineEnd = ""
})

describe("useScrollLock", () => {
  it("reserves the vanishing gutter on the RTL scrollbar side (inline-start), not inline-end", () => {
    // Classic scrollbars sit at inline-start/left in RTL: compensating
    // inline-end pushes content 2*gap instead of holding it still.
    Object.defineProperty(window, "innerWidth", {
      value: 1280,
      configurable: true,
    })
    const spy = vi
      .spyOn(document.documentElement, "clientWidth", "get")
      .mockReturnValue(1274)
    try {
      const { unmount } = renderHook(() => useScrollLock(true))
      const html = document.documentElement
      expect(html.style.overflow).toBe("hidden")
      expect(html.style.paddingInlineStart).toBe("6px")
      expect(html.style.paddingInlineEnd).toBe("")
      unmount()
      expect(html.style.overflow).toBe("")
      expect(html.style.paddingInlineStart).toBe("")
    } finally {
      spy.mockRestore()
    }
  })

  it("stays locked until the last nested lock releases", () => {
    const first = renderHook(() => useScrollLock(true))
    const second = renderHook(() => useScrollLock(true))
    const html = document.documentElement
    expect(html.style.overflow).toBe("hidden")
    first.unmount()
    expect(html.style.overflow).toBe("hidden")
    second.unmount()
    expect(html.style.overflow).toBe("")
  })

  it("neutralizes every Radix body gap variant so a locked body adds no shift", () => {
    const css = readFileSync(
      path.resolve(process.cwd(), "app/globals.css"),
      "utf8"
    )
    const block =
      css.match(/html body\[data-scroll-locked\]\s*\{[^}]*\}/)?.[0] ?? ""
    for (const prop of [
      "margin-right",
      "margin-left",
      "margin-inline-start",
      "margin-inline-end",
      "padding-right",
      "padding-left",
    ]) {
      expect(block).toContain(`${prop}: 0 !important`)
    }
  })
})

import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { FavoriteButton } from "@/components/courts/favorite-button"
import { useAuth } from "@/hooks/use-auth"
import { mockApi } from "./mocks/api"

describe("FavoriteButton", () => {
  beforeEach(() => {
    mockApi.mockReset()
    vi.mocked(useAuth).mockReset()
  })

  describe("when authenticated", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: 1,
          phone: "09120000000",
          full_name: "کاربر تست",
          role: "user" as const,
          is_active: true,
          avatar_url: null,
          created_at: "2026-01-01T00:00:00",
        },
        loading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
        isAuthenticated: true,
      })
    })

    it("checks favorite status on mount", () => {
      mockApi.mockResolvedValueOnce({ favorited_court_ids: [] })
      render(<FavoriteButton courtId={1} />)
      expect(mockApi).toHaveBeenCalledWith(
        "/api/v1/favorites/check?court_ids=1"
      )
    })

    it("renders a heart icon when not favorited", async () => {
      mockApi.mockResolvedValueOnce({ favorited_court_ids: [] })
      const { container } = render(<FavoriteButton courtId={1} />)
      await waitFor(() => {
        const heart = container.querySelector("svg")
        expect(heart).toBeInTheDocument()
      })
    })

    it("renders a heart icon when already favorited", async () => {
      mockApi.mockResolvedValueOnce({ favorited_court_ids: [1] })
      const { container } = render(<FavoriteButton courtId={1} />)
      await waitFor(() => {
        const heart = container.querySelector("svg")
        expect(heart).toBeInTheDocument()
      })
    })
  })

  describe("when not authenticated", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        loading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
        isAuthenticated: false,
      })
    })

    it("renders without checking API", () => {
      render(<FavoriteButton courtId={1} />)
      expect(mockApi).not.toHaveBeenCalled()
    })
  })
})

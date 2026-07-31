import { beforeEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AdminManagerRequestsPage from "@/app/dashboard/admin/manager-requests/page"
import { mockApi } from "./mocks/api"

const pendingRequest = {
  id: 12,
  user_id: 7,
  vendor_name: "مجموعه ورزشی آزمون",
  phone: "09120000000",
  message: "درخواست آزمایشی",
  status: "pending",
  admin_note: null,
  created_at: "2026-07-31T10:00:00Z",
  updated_at: null,
}

describe("AdminManagerRequestsPage", () => {
  beforeEach(() => {
    mockApi.mockReset()
  })

  it("approves a request with an optional admin note", async () => {
    mockApi
      .mockResolvedValueOnce({ requests: [pendingRequest] })
      .mockResolvedValueOnce({
        ...pendingRequest,
        status: "approved",
        admin_note: "مدارک بررسی شد",
      })
    const user = userEvent.setup()

    render(<AdminManagerRequestsPage />)

    expect(await screen.findByText("مجموعه ورزشی آزمون")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "تأیید" }))
    await user.type(
      screen.getByLabelText("توضیح ادمین (اختیاری)"),
      "مدارک بررسی شد"
    )
    await user.click(screen.getByRole("button", { name: "تأیید درخواست" }))

    expect(mockApi).toHaveBeenNthCalledWith(
      2,
      "/api/v1/admin/manager-requests/12",
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "approved",
          admin_note: "مدارک بررسی شد",
        }),
      }
    )
  })

  it("rejects a request without requiring an admin note", async () => {
    mockApi
      .mockResolvedValueOnce({ requests: [pendingRequest] })
      .mockResolvedValueOnce({
        ...pendingRequest,
        status: "rejected",
      })
    const user = userEvent.setup()

    render(<AdminManagerRequestsPage />)

    expect(await screen.findByText("مجموعه ورزشی آزمون")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "رد" }))
    await user.click(screen.getByRole("button", { name: "رد درخواست" }))

    expect(mockApi).toHaveBeenNthCalledWith(
      2,
      "/api/v1/admin/manager-requests/12",
      {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected", admin_note: null }),
      }
    )
  })
})

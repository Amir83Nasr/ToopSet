import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toLocalDateStr } from "@/lib/utils"
import { VendorScheduleTab } from "@/components/vendors/dashboard/vendor-schedule-tab"
import { mockApi } from "./mocks/api"

describe("VendorScheduleTab", () => {
  beforeEach(() => {
    mockApi.mockReset()
  })

  it("shows the template summary and day slots, then opens the editor", async () => {
    const user = userEvent.setup()
    const templatePayload = {
      source: "saved_version",
      version_id: 3,
      minimum_effective_date: toLocalDateStr(new Date()),
      last_online_booking_date: null,
      ball_available: true,
      ball_price: 50000,
      items: [
        {
          day_of_week: 0,
          start_time: "08:00",
          end_time: "10:00",
          base_price: 250000,
          gender: "female",
        },
      ],
    }
    // Week badge sums 7 day totals; 2 per day → ۱۴ سانس
    const weekCountPayload = { slots: [], total: 2 }
    const daySlotsPayload = { slots: [], total: 0 }
    mockApi.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("weekly-schedule-template"))
        return Promise.resolve(templatePayload)
      if (typeof url === "string" && url.includes("limit=1"))
        return Promise.resolve(weekCountPayload)
      return Promise.resolve(daySlotsPayload)
    })

    render(
      <VendorScheduleTab
        vendorId={9}
        weekStart={new Date("2026-08-01T12:00:00")}
        weekLabel="۱۰ تا ۱۶ مرداد"
        canManage
        onPrevWeek={vi.fn()}
        onNextWeek={vi.fn()}
        onThisWeek={vi.fn()}
        onRefresh={vi.fn()}
      />
    )

    expect(
      screen.getByRole("heading", { name: "برنامه هفتگی" })
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith(
        "/api/v1/vendors/9/slots/weekly-schedule-template"
      )
    )
    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/vendors/9/slots?date=")
      )
    )
    expect(await screen.findByText("۱۴ سانس")).toBeInTheDocument()
    expect(screen.queryByText("۱ بانوان")).not.toBeInTheDocument()

    await user.click(screen.getByText("ویرایش برنامه هفتگی"))

    expect(
      await screen.findByRole(
        "heading",
        { name: "ویرایش برنامه هفتگی سالن" },
        { timeout: 10000 }
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "افزودن سانس شنبه" })
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "افزودن سانس شنبه" }))

    // TimePicker: Persian digits, 24h, hour + 10-min-step minute selects
    const startTrigger = screen.getByRole("button", { name: "ساعت شروع" })
    expect(startTrigger).toHaveTextContent("دقیقه : ساعت")
    expect(startTrigger.textContent).not.toMatch(/[AP]M/i)

    await user.click(startTrigger)
    await user.click(screen.getByRole("combobox", { name: "ساعت" }))
    const hourOptions = screen
      .getAllByRole("option")
      .map((option) => option.textContent)
    expect(hourOptions).toHaveLength(24)
    expect(hourOptions[0]).toBe("۰۰")
    expect(hourOptions).not.toContain("۲۴")
    await user.click(screen.getByRole("option", { name: "۰۶" }))
    await user.click(screen.getByRole("combobox", { name: "دقیقه" }))
    expect(
      screen.getAllByRole("option").map((option) => option.textContent)
    ).toEqual(["۰۰", "۱۰", "۲۰", "۳۰", "۴۰", "۵۰"])
    await user.click(screen.getByRole("option", { name: "۰۰" }))
    await user.keyboard("{Escape}")

    await user.click(screen.getByRole("button", { name: "ساعت پایان" }))
    await user.click(screen.getByRole("combobox", { name: "ساعت" }))
    await user.click(screen.getByRole("option", { name: "۰۷" }))
    await user.click(screen.getByRole("combobox", { name: "دقیقه" }))
    await user.click(screen.getByRole("option", { name: "۰۰" }))
    await user.keyboard("{Escape}")

    await user.type(screen.getByLabelText("قیمت سانس"), "200000")
    await user.click(screen.getByRole("button", { name: "افزودن" }))

    expect(
      screen
        .getAllByLabelText("ساعت شروع سانس شنبه")
        .map((element) => element.textContent)
    ).toEqual(["۰۶:۰۰", "۰۸:۰۰"])
  })
})

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

  it("opens cancel dialog for a reserved slot", async () => {
    const user = userEvent.setup()
    const start = new Date()
    start.setDate(start.getDate() + 1)
    start.setHours(10, 0, 0, 0)
    const end = new Date(start)
    end.setHours(11, 30, 0, 0)
    const slot = {
      id: 44,
      vendor_id: 9,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      base_price: 500000,
      ball_price: 0,
      ball_available: false,
      status: "reserved",
      gender: "male",
      is_reserved: true,
      version: 1,
    }
    const booking = {
      id: 77,
      user_id: 3,
      slot_id: slot.id,
      status: "confirmed",
      source: "online",
      price_paid: slot.base_price,
      penalty_amount: null,
      created_at: slot.start_time,
      updated_at: slot.start_time,
      expires_at: null,
      vendor_name: "سالن تست",
      vendor_address: "تهران",
      user_name: "کاربر تست",
      user_phone: "09120000000",
      slot_start_time: slot.start_time,
      slot_end_time: slot.end_time,
    }
    mockApi.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("weekly-schedule-template"))
        return Promise.resolve({
          source: "saved_version",
          minimum_effective_date: toLocalDateStr(new Date()),
          items: [],
        })
      if (typeof url === "string" && url.includes("/manager/bookings?"))
        return Promise.resolve({ bookings: [booking], total: 1 })
      if (typeof url === "string" && url.includes("limit=1"))
        return Promise.resolve({ slots: [], total: 1 })
      return Promise.resolve({ slots: [slot], total: 1 })
    })

    render(
      <VendorScheduleTab
        vendorId={9}
        weekStart={start}
        weekLabel="هفته بعد"
        canManage
        onPrevWeek={vi.fn()}
        onNextWeek={vi.fn()}
        onThisWeek={vi.fn()}
        onRefresh={vi.fn()}
      />
    )

    const dayButtons = await screen.findAllByRole("button")
    const dayButton = dayButtons.find((el) =>
      el.textContent?.includes(
        start.toLocaleDateString("fa-IR", { day: "numeric" })
      )
    )
    if (dayButton) await user.click(dayButton)

    expect(await screen.findByText("رزرو شده")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "لغو رزرو" }))

    expect(
      await screen.findByRole("heading", { name: "جزئیات رزرو سانس" })
    ).toBeInTheDocument()
    expect(screen.getByText("کاربر تست")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "لغو و آزادسازی" })
    ).toBeInTheDocument()
  })

  it("shows a destructive inactive badge", async () => {
    const start = new Date()
    start.setDate(start.getDate() + 1)
    start.setHours(18, 0, 0, 0)
    const end = new Date(start)
    end.setHours(19, 30, 0, 0)
    const slot = {
      id: 12,
      vendor_id: 9,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      base_price: 200000,
      ball_price: 0,
      ball_available: false,
      status: "closed",
      gender: "male",
      is_reserved: false,
      version: 1,
    }
    mockApi.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("weekly-schedule-template"))
        return Promise.resolve({
          source: "saved_version",
          minimum_effective_date: toLocalDateStr(new Date()),
          items: [],
        })
      if (typeof url === "string" && url.includes("limit=1"))
        return Promise.resolve({ slots: [], total: 1 })
      return Promise.resolve({ slots: [slot], total: 1 })
    })

    render(
      <VendorScheduleTab
        vendorId={9}
        weekStart={start}
        weekLabel="هفته بعد"
        canManage
        onPrevWeek={vi.fn()}
        onNextWeek={vi.fn()}
        onThisWeek={vi.fn()}
        onRefresh={vi.fn()}
      />
    )

    const badge = await screen.findByText("غیرفعال")
    expect(badge).toHaveAttribute("data-variant", "destructive")
  })
})

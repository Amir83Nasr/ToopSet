import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ApiError } from "@/lib/api"
import { toLocalDateStr } from "@/lib/utils"
import { WeeklyScheduleEditor } from "@/components/dashboard/schedule/weekly-schedule-editor"
import { VendorScheduleTab } from "@/components/vendors/dashboard/vendor-schedule-tab"
import { mockApi } from "./mocks/api"

describe("WeeklyScheduleEditor", () => {
  beforeEach(() => {
    mockApi.mockReset()
    let itemId = 0
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => `weekly-item-${itemId++}`),
    })
  })

  it("loads the template when opened and confirms manager booking deletion", async () => {
    const user = userEvent.setup()
    const onApplied = vi.fn()
    const lastOnlineBooking = new Date()
    lastOnlineBooking.setDate(lastOnlineBooking.getDate() + 1)
    const minimumEffectiveDate = new Date(lastOnlineBooking)
    minimumEffectiveDate.setDate(minimumEffectiveDate.getDate() + 1)
    mockApi
      .mockResolvedValueOnce({
        source: "saved_version",
        version_id: 1,
        minimum_effective_date: toLocalDateStr(minimumEffectiveDate),
        last_online_booking_date: toLocalDateStr(lastOnlineBooking),
        items: [
          {
            day_of_week: 0,
            start_time: "10:00",
            end_time: "12:00",
            base_price: 150000,
            gender: "female",
          },
        ],
      })
      .mockRejectedValueOnce(
        Object.assign(
          new ApiError(
            409,
            "تغییر ساعت‌ها باعث حذف رزروهای دستی سالن‌دار می‌شود"
          ),
          {
            details: {
              code: "manager_booking_deletion_confirmation_required",
              manager_booking_count: 1,
              conflicts: [
                {
                  slot_id: 12,
                  date: "2026-08-20",
                  booking_id: 42,
                  booking_source: "manager_manual",
                  reason: "این رزرو دستی سالن‌دار با تأیید شما حذف می‌شود",
                },
              ],
            },
          }
        )
      )
      .mockResolvedValueOnce({
        effective_from: "2026-08-20",
        effective_until: "2027-02-20",
        created: 20,
        updated: 0,
        deleted: 1,
        unchanged: 0,
        preserved_reserved: 0,
        deleted_manager_reservations: 1,
        conflicts: [],
      })

    render(
      <WeeklyScheduleEditor
        vendorId={7}
        open
        onOpenChange={vi.fn()}
        onApplied={onApplied}
      />
    )

    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith(
        "/api/v1/vendors/7/slots/weekly-schedule-template"
      )
    )
    expect(await screen.findByText("بانوان")).toBeInTheDocument()
    const priceInput = screen.getByPlaceholderText("قیمت")
    expect(priceInput).toHaveValue("۱۵۰٬۰۰۰")
    await user.clear(priceInput)
    await user.type(priceInput, "1234567")
    expect(priceInput).toHaveValue("۱٬۲۳۴٬۵۶۷")

    const persianMinimumDate = minimumEffectiveDate.toLocaleDateString(
      "fa-IR-u-ca-persian",
      { year: "numeric", month: "long", day: "numeric" }
    )
    expect(
      screen.getByRole("button", { name: persianMinimumDate })
    ).toBeInTheDocument()

    await user.click(screen.getByText("مشاهده خلاصه و تأیید"))
    await user.click(screen.getByText("اعمال برنامه"))

    expect(
      await screen.findByText("حذف رزروهای دستی سالن‌دار")
    ).toBeInTheDocument()
    expect(screen.getByText("۱")).toBeInTheDocument()

    await user.click(screen.getByText("تأیید حذف و اعمال برنامه"))

    await waitFor(() => expect(onApplied).toHaveBeenCalledOnce())
    const confirmedRequest = mockApi.mock.calls[2][1] as RequestInit
    const confirmedBody = JSON.parse(String(confirmedRequest.body))
    expect(confirmedBody.confirm_manager_booking_deletions).toBe(true)
    expect(confirmedBody.effective_from).toBe(
      toLocalDateStr(minimumEffectiveDate)
    )
    expect(confirmedBody.items[0].base_price).toBe(1234567)
    expect(confirmedBody.items[0].gender).toBe("female")
  })
})

describe("VendorScheduleTab", () => {
  beforeEach(() => {
    mockApi.mockReset()
  })

  it("turns the visible weekly table into the editor", async () => {
    const user = userEvent.setup()
    mockApi.mockResolvedValue({
      source: "saved_version",
      version_id: 3,
      minimum_effective_date: toLocalDateStr(new Date()),
      last_online_booking_date: null,
      items: [
        {
          day_of_week: 0,
          start_time: "08:00",
          end_time: "10:00",
          base_price: 250000,
          gender: "female",
        },
      ],
    })

    render(
      <VendorScheduleTab
        vendorId={9}
        allSlots={[]}
        weekStart={new Date("2026-08-01T12:00:00")}
        weekLabel="۱۰ تا ۱۶ مرداد"
        canManage
        loading={false}
        onPrevWeek={vi.fn()}
        onNextWeek={vi.fn()}
        onThisWeek={vi.fn()}
        onRefresh={vi.fn()}
      />
    )

    expect(
      screen.getByRole("heading", { name: "برنامه هفتگی ثابت سالن" })
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith(
        "/api/v1/vendors/9/slots/weekly-schedule-template"
      )
    )
    expect(await screen.findByText("08:00 – 10:00")).toBeInTheDocument()
    expect(screen.getByText("۲۵۰٬۰۰۰ تومان")).toBeInTheDocument()
    expect(screen.getByText("بانوان")).toBeInTheDocument()
    await user.click(screen.getByText("ویرایش برنامه هفتگی"))

    expect(
      await screen.findByRole("heading", {
        name: "ویرایش برنامه هفتگی ثابت سالن",
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "افزودن سانس شنبه" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "برنامه هفتگی ثابت سالن" })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "افزودن سانس شنبه" }))
    expect(
      screen.getByRole("heading", { name: "افزودن سانس شنبه" })
    ).toBeInTheDocument()
    const startTimeInput = screen.getByLabelText("ساعت شروع")
    expect(startTimeInput).toHaveAttribute("type", "text")
    expect(startTimeInput).toHaveAttribute("placeholder", "HH:MM")
    expect(screen.queryByText(/\b(?:AM|PM)\b/i)).not.toBeInTheDocument()
    await user.type(startTimeInput, "06:00")
    await user.type(screen.getByLabelText("ساعت پایان"), "07:00")
    await user.type(screen.getByLabelText("قیمت سانس"), "200000")
    await user.click(screen.getByRole("button", { name: "افزودن سانس" }))

    expect(
      screen
        .getAllByLabelText("ساعت شروع سانس شنبه")
        .map((input) => (input as HTMLInputElement).value)
    ).toEqual(["06:00", "08:00"])
  })
})

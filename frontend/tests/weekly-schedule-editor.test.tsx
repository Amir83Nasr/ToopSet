import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ApiError } from "@/lib/api"
import { toLocalDateStr } from "@/lib/utils"
import { WeeklyScheduleEditor } from "@/components/dashboard/schedule/weekly-schedule-editor"
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
        ball_available: false,
        ball_price: 0,
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
    expect(
      screen.queryByRole("checkbox", { name: /امکان رزرو توپ همراه سانس/ })
    ).not.toBeInTheDocument()

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
    expect(screen.getByLabelText("۱ رزرو دستی")).toBeInTheDocument()

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
    expect(confirmedBody).not.toHaveProperty("ball_available")
    expect(confirmedBody).not.toHaveProperty("ball_price")
  })

  it("sorts night items last and marks after-midnight slots", async () => {
    mockApi.mockResolvedValue({
      source: "saved_version",
      version_id: 1,
      minimum_effective_date: toLocalDateStr(new Date()),
      last_online_booking_date: null,
      ball_available: false,
      ball_price: 0,
      // night tail first in payload order — the editor must still render it last
      items: [
        {
          day_of_week: 0,
          start_time: "00:00",
          end_time: "01:30",
          base_price: 600000,
          gender: "male",
        },
        {
          day_of_week: 0,
          start_time: "21:00",
          end_time: "22:30",
          base_price: 600000,
          gender: "male",
        },
        {
          day_of_week: 0,
          start_time: "22:30",
          end_time: "00:00",
          base_price: 600000,
          gender: "male",
        },
      ],
    })

    render(
      <WeeklyScheduleEditor
        vendorId={7}
        open
        onOpenChange={vi.fn()}
        onApplied={vi.fn()}
      />
    )

    const starts = await screen.findAllByLabelText("ساعت شروع سانس شنبه")
    expect(starts).toHaveLength(3)
    expect(starts.map((node) => node.textContent)).toEqual([
      "۲۱:۰۰",
      "۲۲:۳۰",
      "۰۰:۰۰",
    ])
    // Both the wrapped evening slot and the night tail carry the hint
    expect(await screen.findAllByText("بامداد روز بعد")).toHaveLength(2)
  })
})

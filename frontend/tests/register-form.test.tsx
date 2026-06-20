import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RegisterForm } from "@/components/auth/register-form"
import { ApiError } from "./mocks/api"

const mockRegister = vi.fn()

const defaultProps = {
  register: mockRegister,
}

describe("RegisterForm", () => {
  beforeEach(() => {
    mockRegister.mockReset()
  })

  it("renders the form with all fields", () => {
    render(<RegisterForm {...defaultProps} />)
    expect(screen.getByText("ایجاد حساب کاربری")).toBeInTheDocument()
    expect(screen.getByText("نام و نام خانوادگی")).toBeInTheDocument()
    expect(screen.getByText("شماره موبایل")).toBeInTheDocument()
    expect(screen.getByText("رمز عبور")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "ثبت‌نام" })).toBeInTheDocument()
  })

  it("shows validation errors for empty fields on submit", async () => {
    const user = userEvent.setup()
    render(<RegisterForm {...defaultProps} />)

    await user.click(screen.getByRole("button", { name: "ثبت‌نام" }))

    await waitFor(() => {
      expect(screen.getByText("نام الزامی است")).toBeInTheDocument()
      expect(
        screen.getByText(/رمز عبور باید حداقل ۴ کاراکتر باشد/i)
      ).toBeInTheDocument()
    })
  })

  it("calls register with valid data on submit", async () => {
    mockRegister.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<RegisterForm {...defaultProps} />)

    await user.type(screen.getByPlaceholderText("مثلاً علی محمدی"), "علی محمدی")
    await user.type(screen.getByPlaceholderText(/مثلاً ۰۹/), "09120000000")
    await user.type(screen.getByPlaceholderText("حداقل ۴ کاراکتر"), "test1234")

    await user.click(screen.getByRole("button", { name: "ثبت‌نام" }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledTimes(1)
      expect(mockRegister).toHaveBeenCalledWith(
        { phone: "09120000000", password: "test1234", full_name: "علی محمدی" },
        undefined
      )
    })
  })

  it("shows toast error when registration fails", async () => {
    mockRegister.mockRejectedValueOnce(
      new ApiError(400, "شماره تلفن تکراری است")
    )
    const user = userEvent.setup()
    const { toast } = await import("@/lib/toast")

    render(<RegisterForm {...defaultProps} />)

    await user.type(screen.getByPlaceholderText("مثلاً علی محمدی"), "علی محمدی")
    await user.type(screen.getByPlaceholderText(/مثلاً ۰۹/), "09120000000")
    await user.type(screen.getByPlaceholderText("حداقل ۴ کاراکتر"), "test1234")

    await user.click(screen.getByRole("button", { name: "ثبت‌نام" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("شماره تلفن تکراری است")
    })
  })

  it("calls onSuccess callback on successful registration", async () => {
    const onSuccess = vi.fn()
    mockRegister.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<RegisterForm {...defaultProps} onSuccess={onSuccess} />)

    await user.type(screen.getByPlaceholderText("مثلاً علی محمدی"), "علی محمدی")
    await user.type(screen.getByPlaceholderText(/مثلاً ۰۹/), "09120000000")
    await user.type(screen.getByPlaceholderText("حداقل ۴ کاراکتر"), "test1234")

    await user.click(screen.getByRole("button", { name: "ثبت‌نام" }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })
})

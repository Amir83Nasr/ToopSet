import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LoginForm } from "@/components/auth/login-form"
import { mockLogin } from "./mocks/use-auth"
import { ApiError } from "./mocks/api"

const defaultProps = {
  login: mockLogin,
}

describe("LoginForm", () => {
  beforeEach(() => {
    mockLogin.mockReset()
  })

  it("renders the form with all fields", () => {
    render(<LoginForm {...defaultProps} />)
    expect(screen.getByText("ورود به توپ‌سِت")).toBeInTheDocument()
    expect(screen.getByText("شماره موبایل")).toBeInTheDocument()
    expect(screen.getByText("رمز عبور")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "ورود" })).toBeInTheDocument()
  })

  it("renders the register link", () => {
    render(<LoginForm {...defaultProps} />)
    expect(screen.getByText("ثبت‌نام")).toBeInTheDocument()
    expect(screen.getByText("حساب کاربری ندارید؟")).toBeInTheDocument()
  })

  it("shows validation errors for empty fields on submit", async () => {
    const user = userEvent.setup()
    render(<LoginForm {...defaultProps} />)

    await user.click(screen.getByRole("button", { name: "ورود" }))

    await waitFor(() => {
      // Should show validation messages for empty fields
      expect(
        screen.getByText(/رمز عبور باید حداقل ۴ کاراکتر باشد/i)
      ).toBeInTheDocument()
    })
  })

  it("shows phone validation error for invalid 11-digit phone", async () => {
    const user = userEvent.setup()
    render(<LoginForm {...defaultProps} />)

    const phoneInput = screen.getByPlaceholderText(/مثلاً/)
    await user.type(phoneInput, "12345678901")
    await user.click(screen.getByRole("button", { name: "ورود" }))

    await waitFor(() => {
      expect(
        screen.getByText(/شماره تلفن باید با ۰۹ شروع شود/i)
      ).toBeInTheDocument()
    })
  })

  it("calls login with valid credentials on submit", async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<LoginForm {...defaultProps} />)

    const phoneInput = screen.getByPlaceholderText(/مثلاً/)
    await user.type(phoneInput, "09120000000")

    const passwordInput = screen.getByPlaceholderText(/حداقل/)
    await user.type(passwordInput, "test1234")

    await user.click(screen.getByRole("button", { name: "ورود" }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1)
      expect(mockLogin).toHaveBeenCalledWith(
        { phone: "09120000000", password: "test1234" },
        undefined
      )
    })
  })

  it("shows toast error when login fails", async () => {
    mockLogin.mockRejectedValueOnce(
      new ApiError(401, "اطلاعات وارد شده صحیح نیست")
    )
    const user = userEvent.setup()
    const { toast } = await import("@/lib/toast")

    render(<LoginForm {...defaultProps} />)

    const phoneInput = screen.getByPlaceholderText(/مثلاً/)
    await user.type(phoneInput, "09120000000")

    const passwordInput = screen.getByPlaceholderText(/حداقل/)
    await user.type(passwordInput, "test1234")

    await user.click(screen.getByRole("button", { name: "ورود" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("اطلاعات وارد شده صحیح نیست")
    })
  })

  it("calls onSuccess callback on successful login", async () => {
    const onSuccess = vi.fn()
    mockLogin.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<LoginForm {...defaultProps} onSuccess={onSuccess} />)

    const phoneInput = screen.getByPlaceholderText(/مثلاً/)
    await user.type(phoneInput, "09120000000")

    const passwordInput = screen.getByPlaceholderText(/حداقل/)
    await user.type(passwordInput, "test1234")

    await user.click(screen.getByRole("button", { name: "ورود" }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })

  it("calls onRegisterClick when register button is clicked", async () => {
    const onRegisterClick = vi.fn()
    const user = userEvent.setup()
    render(<LoginForm {...defaultProps} onRegisterClick={onRegisterClick} />)

    await user.click(screen.getByText("ثبت‌نام"))

    expect(onRegisterClick).toHaveBeenCalledTimes(1)
  })
})

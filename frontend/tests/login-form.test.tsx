import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LoginForm } from "@/components/auth/login-form"
import { mockCheckLoginOptions, mockLogin } from "./mocks/use-auth"
import { ApiError } from "./mocks/api"

const defaultProps = {
  login: mockLogin,
  checkLoginOptions: mockCheckLoginOptions,
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogin.mockReset()
    mockCheckLoginOptions.mockReset()
  })

  async function continueToPassword(user: ReturnType<typeof userEvent.setup>) {
    mockCheckLoginOptions.mockResolvedValueOnce({
      is_new_user: false,
      has_password: true,
    })
    render(<LoginForm {...defaultProps} />)
    const phoneInput = screen.getByPlaceholderText(/مثلاً/)
    await user.type(phoneInput, "09120000000")
    await user.click(screen.getByRole("button", { name: "ادامه" }))
    await screen.findByText("ورود با رمز عبور")
  }

  it("renders the phone step first", () => {
    render(<LoginForm {...defaultProps} />)
    expect(screen.getByText("ورود به توپ‌سِت")).toBeInTheDocument()
    expect(screen.getByText("شماره موبایل")).toBeInTheDocument()
    expect(screen.queryByText("رمز عبور")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "ادامه" })).toBeInTheDocument()
  })

  it("does not continue with an empty phone", async () => {
    render(<LoginForm {...defaultProps} />)

    expect(screen.getByRole("button", { name: "ادامه" })).toBeDisabled()
    expect(mockCheckLoginOptions).not.toHaveBeenCalled()
  })

  it("shows phone validation error for invalid 11-digit phone", async () => {
    const user = userEvent.setup()
    render(<LoginForm {...defaultProps} />)

    const phoneInput = screen.getByPlaceholderText(/مثلاً/)
    await user.type(phoneInput, "12345678901")
    await user.click(screen.getByRole("button", { name: "ادامه" }))

    await waitFor(() => {
      expect(
        screen.getByText(/شماره تلفن باید با ۰۹ شروع شود/i)
      ).toBeInTheDocument()
    })
  })

  it("calls login with valid credentials on submit", async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    await continueToPassword(user)

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

    await continueToPassword(user)

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
    mockCheckLoginOptions.mockResolvedValueOnce({
      is_new_user: false,
      has_password: true,
    })
    render(<LoginForm {...defaultProps} onSuccess={onSuccess} />)
    await user.type(screen.getByPlaceholderText(/مثلاً/), "09120000000")
    await user.click(screen.getByRole("button", { name: "ادامه" }))
    await screen.findByText("ورود با رمز عبور")

    const passwordInput = screen.getByPlaceholderText(/حداقل/)
    await user.type(passwordInput, "test1234")

    await user.click(screen.getByRole("button", { name: "ورود" }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })
})

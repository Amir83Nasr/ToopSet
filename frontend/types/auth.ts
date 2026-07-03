export interface User {
  id: number
  phone: string
  full_name: string
  role: "user" | "manager" | "admin"
  is_active: boolean
  has_password: boolean
  avatar_url?: string | null
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User | null
}

export interface LoginRequest {
  phone: string
  password: string
}

export interface LoginOptionsRequest {
  phone: string
}

export interface LoginOptionsResponse {
  is_new_user: boolean
  has_password: boolean
}

export interface RegisterRequest {
  phone: string
  password: string
  full_name: string
}

// ── OTP types ──────────────────────────────────────────────────────

export interface SendOtpRequest {
  phone: string
}

export interface SendOtpResponse {
  message: string
  is_new_user: boolean
  has_password: boolean
  expires_in: number
}

export interface VerifyOtpRequest {
  phone: string
  code: string
  purpose?: "login" | "password_reset"
  full_name?: string
}

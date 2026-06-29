export interface User {
  id: number
  phone: string
  full_name: string
  role: "user" | "manager" | "admin"
  is_active: boolean
  avatar_url?: string | null
  created_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User | null
}

export interface LoginRequest {
  phone: string
  password: string
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
}

export interface VerifyOtpRequest {
  phone: string
  code: string
  full_name?: string
}

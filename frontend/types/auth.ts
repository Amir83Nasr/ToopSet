export interface User {
  id: number
  phone: string
  full_name: string
  role: "user" | "manager" | "admin"
  is_active: boolean
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

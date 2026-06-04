export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export interface FieldError {
  field: string
  message: string
}

export interface ApiErrorResponse {
  detail: string
  error_code?: string | null
  timestamp?: string | null
  path?: string | null
  fields?: FieldError[] | null
}

# Frontend F1 — Auth UI

## TL;DR
> Build login + register pages with shadcn/ui, JWT auth hook, and API client.
> All Persian RTL, no emojis, matching existing shadcn radix-nova theme.
>
> **Deliverables**:
> - 2 pages: `/login`, `/register`
> - 2 form components: login-form, register-form
> - 1 auth hook + 1 API client
> - TypeScript types
> - Sonner toast for notifications

---

## TODOs

- [ ] 1. Create TypeScript types in `types/auth.ts`

  **What to do**:
  - Create `User`, `AuthResponse`, `LoginRequest`, `RegisterRequest` interfaces
  - Match backend Pydantic schemas exactly

  **Files to create**:
  - `frontend/types/auth.ts`

- [ ] 2. Create API client in `lib/api.ts`

  **What to do**:
  - Create `api<T>()` fetch wrapper with base URL from `NEXT_PUBLIC_API_URL`
  - Auto-attach `Authorization: Bearer` from localStorage
  - `setTokens()` / `clearTokens()` helpers
  - `ApiError` class with status + message

  **Files to create**:
  - `frontend/lib/api.ts`

- [ ] 3. Create auth hook `hooks/use-auth.ts`

  **What to do**:
  - `useAuth()` hook: user state, loading, login, register, logout
  - On mount, check localStorage for token and call `/api/v1/auth/me`
  - Login/register call backend, store tokens, redirect to `/`
  - Export `UseAuthReturn` type

  **Files to create**:
  - `frontend/hooks/use-auth.ts`

- [ ] 4. Create login form component

  **What to do**:
  - `LoginForm` — Card + Input (phone, password) + Button + Link to register
  - Call `login()` from useAuth on submit
  - Show error toast on failure via Sonner
  - Persian RTL, no emojis

  **Files to create**:
  - `frontend/components/auth/login-form.tsx`
  - Uses: card, input, label, button, sonner

- [ ] 5. Create register form component

  **What to do**:
  - `RegisterForm` — Card + Input (name, phone, password) + Button + Link to login
  - Client-side validation: password min 4 chars
  - Call `register()` from useAuth on submit
  - Show error toast on failure via Sonner

  **Files to create**:
  - `frontend/components/auth/register-form.tsx`
  - Uses: card, input, label, button, sonner

- [ ] 6. Create `/login` and `/register` pages

  **What to do**:
  - Place both in `(auth)` route group with `layout.tsx` that centers content
  - `/login/page.tsx` — renders LoginForm with useAuth
  - `/register/page.tsx` — renders RegisterForm with useAuth

  **Files to create**:
  - `frontend/app/(auth)/layout.tsx`
  - `frontend/app/(auth)/login/page.tsx`
  - `frontend/app/(auth)/register/page.tsx`

- [ ] 7. Update root layout — add Toaster

  **What to do**:
  - Import `Toaster` from sonner and place in body
  - Wrap app with a client provider that exposes useAuth via context

  **Files to modify**:
  - `frontend/app/layout.tsx`

- [ ] F1. Verify full flow

  **What to do**:
  - Start frontend: `cd frontend && npm run dev`
  - Visit `/login` — form renders with correct RTL, shadcn styling
  - Register a new user → redirect to `/`
  - Logout → redirect to `/login`
  - Login → redirect to `/`
  - Wrong password → toast error
  - Duplicate phone → toast error

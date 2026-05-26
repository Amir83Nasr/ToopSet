# Commit Convention — ToopSet

## Format

```txt
<type>(<scope>): <English summary>

<English description of what and why (optional)>
```

## Types

| Type     | When to use                        |
| -------- | ---------------------------------- |
| `feat`   | New feature                        |
| `fix`    | Bug fix                            |
|`refactor`| Code rewrite, no behavior change   |
| `style`  | CSS, font, theme changes           |
| `perf`   | Performance optimization           |
| `test`   | Adding or fixing tests             |
| `docs`   | Documentation, README, comments    |
| `chore`  | Tools, deploy, Docker config       |
| `db`     | Database migration or model change |
| `api`    | Backend endpoint changes           |
| `ui`     | Frontend component changes         |
| `infra`  | docker-compose, env, CI/CD         |

## Scopes

| Scope      | Meaning                  |
| ---------- | ------------------------ |
| `backend`  | FastAPI backend          |
| `frontend` | Next.js frontend         |
| `root`     | Makefile, docker-compose |
| `auth`     | Authentication           |
| `booking`  | Booking system           |
| `payment`  | Payment processing       |
| `court`    | Court management         |
| `review`   | Reviews and ratings      |

## Rules

- **No punctuation in title** — short and direct
- **Max 72 characters** for the title
- **Imperative mood** ("add" not "added")
- **Lowercase type/scope** — `feat(auth):`
- **No space before colon** — `feat(auth):` not `feat(auth) :`

## Examples

```txt
feat(auth): اضافه کردن ثبت‌نام با شماره موبایل

Implement phone registration with OTP mock. Users can sign up
with phone + password, verification code logged to console.
```

```txt
fix(booking): رفع مشکل optimistic lock در رزرو همزمان

Added version column check to prevent race conditions when
two users book the same slot simultaneously.
```

```txt
db(backend): اضافه کردن ستون penalty_amount به bookings

New column to track cancellation penalties per booking.
Migration: 0002_add_penalty_to_bookings
```

```txt
infra(root): اضافه کردن Redis به docker-compose

Added redis:7-alpine service with named volume and healthcheck.
```

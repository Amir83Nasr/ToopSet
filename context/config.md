# Config — Code Styles

## Comment Style

### Backend (Python)

```python
# ── Section headers ─────────────────────────────────────────────
# Use `# ──` bounding lines for major sections

"""Module-level docstring with purpose and usage notes."""

# Inline comments explain WHY, not what (code is self-documenting)
```

### Frontend (TypeScript/TSX)

```typescript
// ── Section headers ─────────────────────────────────────────────
// Use `// ──` bounding lines for major sections

/** JSDoc for exported functions/types */
export function helper(): void { ... }

/* eslint-disable @typescript-eslint/no-explicit-any */
// Use for leaflet/map interop (prefix with explanation)
```

### CSS

```css
/* ── Section headers ──────────────────────────────────────────── */
/* Use `/* ── */` for grouping related styles */

@layer base {
  * { ... }
  body { ... }
}
```

## Makefile Structure

```makefile
# ─── Section name ──────────────────────────────────────────────────
target: deps ## Description (shown in help)
	@command
	@echo "  $(GREEN)✓$(RESET) Done"
```

| Pattern   | Convention                                 |
| --------- | ------------------------------------------ |
| Sections  | `# ─── Name ─────────────────────────────` |
| Targets   | Lowercase kebab-case                       |
| Help text | After `## ` on same line as target         |
| Colors    | ANSI vars (GREEN, RED, CYAN, etc.)         |
| Shell     | `.ONESHELL:`, `SHELL := /bin/bash`         |
| Docker    | Variables for image tag, project name      |

## Environment Variables

| File                  | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `backend/.env`        | DB creds, JWT secret, Redis, Sentry, OTEL, profiler    |
| `frontend/.env.local` | API URL, Neshan API key                                |
| `compose.yml`         | Docker env vars                                        |

### Key Backend Vars

| Variable                        | Default                          | Purpose                              |
| ------------------------------- | -------------------------------- | ------------------------------------ |
| `POSTGRES_*`                    | toopset / localhost / 5432       | Database connection                  |
| `SECRET_KEY`                    | change-me-...                    | JWT signing (min 32 chars)           |
| `SECRET_KEY_PREVIOUS`           | (empty)                          | Previous key for rotation            |
| `REDIS_HOST/PORT`               | localhost / 6379                 | Redis connection                     |
| `SENTRY_DSN`                    | (empty)                          | Sentry error tracking                |
| `CORS_ORIGINS`                  | *                                 | Allowed origins (warns if * in prod) |
| `ACCESS_TOKEN_EXPIRE_MINUTES`   | 30                               | JWT access token lifetime            |
| `REFRESH_TOKEN_EXPIRE_DAYS`     | 7                                | Refresh token lifetime               |
| `PAYMENT_GATEWAY`               | mock                             | Payment provider                     |
| `SMS_PROVIDER`                  | mock                             | SMS provider                         |
| `DB_POOL_SIZE`                  | 20                               | Connection pool size                 |
| `DB_MAX_OVERFLOW`               | 10                               | Pool overflow limit                  |
| `DB_POOL_RECYCLE`               | 1800                             | Connection recycle (seconds)         |
| `DB_POOL_TIMEOUT`               | 5                                | Pool timeout (seconds)               |
| `LOG_LEVEL`                     | INFO                             | Logging level                        |
| `CORRELATION_ID_HEADER`         | X-Request-ID                     | Correlation ID header name           |
| `OTEL_ENABLED`                  | False                            | OpenTelemetry master switch          |
| `OTEL_EXPORTER_OTLP_ENDPOINT`   | localhost:4317                   | OTLP gRPC endpoint                   |
| `PROFILER_ENABLED`              | False                            | Request profiling middleware         |
| `JWT_ISSUER`                    | toopset-api                      | JWT iss claim                        |
| `JWT_AUDIENCE`                  | toopset-client                   | JWT aud claim                        |

### Key Frontend Vars

| Variable                      | Purpose                        |
| ----------------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL`         | Backend API URL                |
| `NEXT_PUBLIC_NESHAN_API_KEY`  | Neshan Maps API key            |

## File Naming

| Language         | Convention                  |
| ---------------- | --------------------------- |
| Python           | `snake_case.py`             |
| TypeScript       | `kebab-case.ts`             |
| React components | `kebab-case.tsx`            |
| CSS              | `globals.css` (single file) |

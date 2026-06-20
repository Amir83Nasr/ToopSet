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

| File                  | Purpose                             |
| --------------------- | ----------------------------------- |
| `backend/.env`        | DB creds, JWT secret, Redis, Sentry |
| `frontend/.env.local` | API URL, Neshan API key             |
| `compose.yml`         | Docker env vars                     |

Key backend vars: `POSTGRES_*`, `SECRET_KEY`, `SENTRY_DSN`, `REDIS_HOST/PORT`
Key frontend vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_NESHAN_API_KEY`

## File Naming

| Language         | Convention                  |
| ---------------- | --------------------------- |
| Python           | `snake_case.py`             |
| TypeScript       | `kebab-case.ts`             |
| React components | `kebab-case.tsx`            |
| CSS              | `globals.css` (single file) |

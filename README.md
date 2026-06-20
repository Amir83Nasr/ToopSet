# توپ‌سِت

**ToopSet** — Online sports court booking platform for Qom, Iran.

## Stack

- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui
- **Backend:** Python 3.12 + FastAPI + SQLAlchemy async
- **DB:** PostgreSQL 17 + Redis 7
- **Maps:** Neshan Maps SDK (Qom-bounded)

## Quick Start

```bash
make install     # Install all dependencies
make db          # Start Postgres + Redis
make db-seed     # Seed with test data
make dev-backend # Backend on :8000
make dev-frontend# Frontend on :3000
```

See [context/commands.md](context/commands.md) for all commands.

## Project Status

Pre-launch. SMS and payment gateways are mocked.

## Docs

| File | Content |
|------|---------|
| [architect.md](context/architect.md) | Architecture & data flow |
| [backend.md](context/backend.md) | Models, services, key decisions |
| [frontend.md](context/frontend.md) | Pages, components, API, maps |
| [ui.md](context/ui.md) | Theming, layout, conventions |
| [commands.md](context/commands.md) | Makefile reference |
| [commit.md](context/commit.md) | Commit conventions |

## Version

`0.4.0` — single source of truth in [VERSION](VERSION).

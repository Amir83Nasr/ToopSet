# توپ‌سِت | ToopSet

An online platform for booking sports courts — built with **Next.js** (frontend) and **FastAPI** (backend).

## Tech Stack

| Layer          | Stack                                                        |
| -------------- | ------------------------------------------------------------ |
| **Frontend**   | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| **Backend**    | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic        |
| **Database**   | PostgreSQL 17, Redis 7                                       |
| **Monitoring** | Sentry, Prometheus, Grafana                                  |

## Prerequisites

- Python 3.12+
- Node.js 22+
- Docker & Docker Compose (for Postgres + Redis)
- pre-commit (optional, for git hooks)

## Quick Start

```bash
# 1. Start databases (Postgres + Redis)
make db

# 2. Install dependencies
make install

# 3. Run migrations
cd backend && alembic upgrade head

# 4. Start development servers (two terminals)
make back-dev       # backend → http://localhost:8000
make front-dev      # frontend → http://localhost:3000
```

Or open both in split Terminal tabs with:

```bash
make dev
```

## Project Structure

```
toopset/
├── backend/               # FastAPI application
│   ├── app/
│   │   ├── api/v1/       # Route handlers (16 routers)
│   │   ├── core/         # Config, database, security, logging
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic request/response models
│   │   ├── services/     # Business logic
│   │   └── repositories/ # Data access layer
│   ├── migrations/       # Alembic migrations
│   ├── tests/            # Pytest test suite
│   ├── scripts/          # Seed scripts
│   └── uploads/          # Uploaded files (avatars, court images)
├── frontend/             # Next.js application
│   ├── app/              # App Router pages & layouts
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # shadcn/ui primitives
│   │   ├── auth/        # LoginForm, RegisterForm
│   │   ├── courts/      # Court-related components
│   │   ├── dashboard/   # AppSidebar, SiteHeader
│   │   └── public/      # Landing page sections
│   ├── hooks/            # use-auth, use-geolocation
│   ├── lib/              # api client, utils, toast
│   ├── types/            # TypeScript definitions
│   └── tests/            # Vitest test suite
├── docs/                 # Design docs (DFD, ERD)
├── scripts/              # Root-level automation scripts
├── compose.yml           # Docker Compose (full stack)
└── Makefile              # Project automation
```

## Makefile Targets

```txt
make db             Start only Postgres + Redis
make db-stop        Stop databases
make up             Start all Docker services
make down           Stop all Docker services
make build          Build frontend for production
make back-dev       Backend dev server (uvicorn --reload)
make front-dev      Frontend dev server (Turbopack HMR)
make back-lint      Lint Python code (ruff)
make back-format    Format Python code (ruff)
make back-typecheck Type-check Python code (mypy)
make front-lint     Lint frontend code (ESLint)
make front-format   Format frontend code (Prettier)
make front-typecheck TypeScript type checking (tsc)
make check          Run ALL checks (lint + format + typecheck)
make test           Run all test suites
make doctor         System health check
make version        Show current project version
make version-check  Verify version consistency across files
make version-sync   Sync VERSION → __init__.py + package.json
make version-bump   Bump version (BUMP=patch|minor|major)
make version-tag    Create git tag v$(VERSION) and push
```

## Environment Variables

Each service has its own env file:

| File                    | Purpose                       |
| ----------------------- | ----------------------------- |
| `.env`                  | Docker Compose infrastructure |
| `backend/.env`          | Backend runtime variables     |
| `backend/.env.example`  | Backend env template          |
| `frontend/.env.local`   | Frontend runtime variables    |
| `frontend/.env.example` | Frontend env template         |
| `.env.example`          | Comprehensive reference       |

Copy the relevant example file and adjust values for your setup:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

## Version Management

Single source of truth is `VERSION` file at project root:

```bash
make version                # Show current version
make version-check          # Verify consistency across all files
make version-sync           # Sync VERSION → __init__.py + package.json
make version-bump BUMP=patch    # 0.2.0 → 0.2.1
make version-bump BUMP=minor    # 0.2.0 → 0.3.0
make version-bump BUMP=major    # 0.2.0 → 1.0.0
make version-tag            # git tag v0.2.x + push (triggers CD)
```

Backend reads version dynamically from `backend/app/__init__.py` (`__version__`) via
`pyproject.toml`'s `version = {attr = "app.__version__"}`.

## Pre-commit Hooks

This project uses [pre-commit](https://pre-commit.com) for automated code quality checks:

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files    # Run once on all files
```

Hooks run automatically on `git commit`. They cover:

- Trailing whitespace, EOF fixes, YAML/JSON/TOML validation
- Python formatting & linting (Ruff)
- Frontend formatting (Prettier + Tailwind plugin)
- Frontend linting (ESLint)

## Architecture

Every feature follows this dependency chain:

```
Route → Service → Repository → Model
```

- **Routers**: Define HTTP endpoints, validation, auth dependencies
- **Services**: Orchestrate business logic
- **Repositories**: Raw DB queries via SQLAlchemy async sessions
- **Models**: SQLAlchemy ORM definitions

### Roles

| Role        | Access                                          |
| ----------- | ----------------------------------------------- |
| **user**    | Browse courts, book slots, manage wallet        |
| **manager** | Register & manage courts, view reports          |
| **admin**   | Approve courts, manage users, platform settings |

## Auth Flow

```
Register/Login → { access_token, refresh_token, user }
  ↓
Access token (30 min) used for API calls
Refresh token (7 days) used to get new access tokens
  ↓
On 401: api() helper auto-refreshes and retries
  ↓
Token version (ver) enables session invalidation
```

## Contributing

- Code, variable names, commit messages are in **English**
- UI text, errors, Swagger summaries are in **Persian**
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/):
  `feat:`, `fix:`, `refactor:`, `chore:`, etc.
- RTL layout: use `me-`, `ms-` instead of `ml-`, `mr-`
- Run `make check` before pushing

## License

Proprietary — All rights reserved. See [LICENSE](LICENSE) for details.

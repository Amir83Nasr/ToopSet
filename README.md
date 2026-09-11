<p align="center">
  <img src="frontend/public/icons/square.svg" alt="ToopSet" width="120" />
</p>

<h1 align="center">ToopSet</h1>

<p align="center">
  <strong>Online sports court booking platform for Qom, Iran</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/FastAPI-Latest-009688" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-336791" alt="PostgreSQL 17" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D" alt="Redis 7" />
</p>

---

## Overview

Persian-first court discovery and booking. Role-based dashboards (user, manager, admin), real-time booking, payment simulation, observability stack.

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | Next.js 16 + React 19 + TS + Tailwind v4 + shadcn/ui |
| Backend | Python 3.12 + FastAPI + SQLAlchemy 2.0 (async) + Alembic |
| Data | PostgreSQL 17 + Redis 7 |
| Auth | JWT (HS256) + bcrypt + refresh rotation |
| Locale | fa-IR, RTL, Jalali, Persian digits |
| Infra | Vercel (frontend) + Railway (backend) + Docker Compose (local) |

## Quickstart

```bash
make install
make db-start
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
make db-migrate && make db-seed
make dev-backend   # :8000
make dev-frontend  # :3000
```

Verify: `make doctor`, `make check`, `make test`

## Structure

```
frontend/   # Next.js app (app/, components/, lib/, tests/)
backend/    # FastAPI (api/v1/, core/, models/, schemas/, services/, repositories/)
.github/    # ci.yml + deploy-*.yml
compose.yml # postgres + redis
```

## Workflow

- Branches: `main` (prod) → `develop` (staging) → `feature/*`, `fix/*`, `hotfix/*`. See [BRANCH_STRATEGY.md](BRANCH_STRATEGY.md).
- CI per PR: lint → typecheck → build → test. Secrets via dashboards, never committed `.env.production`.
- Migrations run before app start (`alembic upgrade head`); rollback: `alembic downgrade -1`.

---

## License

All Rights Reserved. Copyright (c) 2026 ToopSet Team. See [LICENSE](LICENSE).

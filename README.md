# ToopSet

An online platform for booking sports courts — built with **Next.js** (frontend) and **FastAPI** (backend).

## Tech Stack

| Layer          | Stack                                                        |
| -------------- | ------------------------------------------------------------ |
| **Frontend**   | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| **Backend**    | Python 3.12, FastAPI, SQLAlchemy (async), Alembic            |
| **Database**   | PostgreSQL 17, Redis 7                                       |
| **Monitoring** | ELK (Elasticsearch + Logstash + Kibana), Prometheus, Grafana |

## Quick Start

```bash
# 1. Start databases (Postgres + Redis)
make db

# 2. Install dependencies
make install

# 3. Run migrations
make back-migrate

# 4. Start development servers (two terminals)
make back-dev      # backend → http://localhost:8000
make front-dev     # frontend → http://localhost:3000
```

Or open both in split Terminal tabs:

```bash
make dev
```

## Makefile Targets

```txt
make db             Start only Postgres + Redis
make db-stop        Stop databases
make up             Start all Docker services
make down           Stop all Docker services
make build          Build single toopset Docker image
make run            Run single toopset image
make back-dev       Backend dev server (uvicorn --reload)
make front-dev      Frontend dev server (Turbopack HMR)
make back-lint      Lint Python code (ruff)
make back-format    Format Python code (ruff)
make back-typecheck Type-check Python code (mypy)
make front-lint     Lint frontend code (ESLint)
make front-format   Format frontend code (Prettier)
make front-typecheck TypeScript type checking (tsc)
make check          Run ALL checks (lint + format + typecheck)
make doctor         System health check
```

## Project Structure

```txt
toopset/
├── backend/          # FastAPI application
│   ├── app/
│   │   ├── api/      # Route handlers
│   │   ├── core/     # Config, database, security, logging
│   │   ├── models/   # SQLAlchemy models
│   │   ├── schemas/  # Pydantic schemas
│   │   ├── services/ # Business logic
│   │   └── repositories/  # Data access layer
│   └── migrations/   # Alembic migrations
├── frontend/         # Next.js application
│   ├── app/          # Pages & layouts
│   ├── components/   # Reusable UI components
│   └── lib/          # Utilities, API client
├── grafana/          # Grafana dashboard provisioning
├── logstash/         # Logstash pipeline config
├── prometheus/       # Prometheus scrape config
├── compose.yml       # Docker Compose (full stack)
├── Dockerfile        # Single Docker image
└── Makefile          # Project automation
```

## License

MIT

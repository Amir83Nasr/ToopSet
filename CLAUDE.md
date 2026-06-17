# ToopSet — Claude Code Instructions

## Every conversation start

1. Read `AGENTS.md` for full project context
2. Review the overall project structure (backend + frontend)
3. Check `docs/tasks.md` for current work status
4. Check `git status` and `git log --oneline -5` for recent changes

## Task tracking

- When starting work on any task, immediately update `docs/tasks.md` — move or add the task to **In Progress** so the user can monitor
- Keep `docs/tasks.md` updated throughout — mark tasks done, add new ones, update "Last updated" date
- Keep `AGENTS.md` synced with any architecture/routing/convention changes
- Update this file (`CLAUDE.md`) when project structure or conventions change significantly

## Capabilities & permissions

- **Skills**: Use available skills wherever they apply — skill usage is fully permitted
- **Agents**: Automatically delegate between different agent types (Explore, Plan, code-reviewer, etc.) as needed for the task — no restriction on agent switching
- **Commands**: Full unrestricted access to all bash, git, npm, pip, alembic, and any other dev commands — no permission restrictions

## Key project facts

- **Version**: 0.3.1 — Persian sports venue booking platform
- **Backend**: Python 3.12+ / FastAPI / SQLAlchemy async / PostgreSQL / Redis
- **Frontend**: Next.js 16 (App Router) / TypeScript (strict) / Tailwind CSS v4 / shadcn/ui
- **Auth**: JWT (access + refresh), localStorage, auto-refresh
- **Layout**: RTL Persian (`dir="rtl"`, `lang="fa"`) — IranYekanX font
- **License**: Proprietary — All rights reserved
- **Pre-commit hooks active**: ruff, prettier, eslint

## Baseline behaviors

- Allowed: Full bash access, git, npm, pip, alembic, etc.
- No prompt for permissions on standard dev commands
- Persian UI text, English code/comments/commits
- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, etc.
- **Pre-commit hooks** — must pass successfully before committing. Fix any hook failures (ESLint, prettier, ruff, etc.) before creating the commit. Never use `--no-verify` to bypass checks.
- **Tests** — run `make test` before every commit. All tests must pass. Fix failures before committing.
- **shadcn** — always check and use shadcn/ui components, blocks, and patterns when implementing UI. Prefer their documented API over custom solutions.

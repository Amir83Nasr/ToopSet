---
name: docs
description: >
  Manage project context documentation. Two modes: "docs update" scans the
  project code and regenerates context/*.md files to match current project
  state; "docs read" reads all context/*.md, CLAUDE.md, and TODO.md plus
  scans the project itself, then presents a comprehensive overview. Trigger
  when the user says "docs update", "docs read", "update docs", "read docs",
  "بروزرسانی مستندات", or any request to refresh the project's documentation
  or get a full project overview.
---

# docs

Management of the project's context documentation — both updating the docs
and reading them for a comprehensive overview.

## When to use

- The user says "docs update" — they want to regenerate context/*.md files
  from the actual project code
- The user says "docs read" — they want to read all context docs + project
  scan for a complete picture
- The user says "بروزرسانی مستندات", "مستندات رو بخون", "آپدیت داکیومنت"
- The user starts working and needs context loaded

## `docs read`

Loads the full project picture into the conversation.

### What it does

1. **Reads all documentation files:**
   - `CLAUDE.md` — project overview, version, context file index
   - `context/*.md` — architecture, backend, frontend, UI, config,
     commands, commit conventions
   - `TODO.md` — current task tracking (backlog, in progress, done)

2. **Independently scans the project code** to *validate and supplement*
   the documentation:
   - Backend structure (api/, models/, services/, repositories/,
     schemas/, core/, migrations/)
   - Frontend structure (app/ pages, components/, hooks/, lib/, types/)
   - Config files (package.json, Makefile, compose.yml, .env*)
   - Key code patterns (routing, auth, models, components)
   - Also reads `context/MEMORY.md` for any existing session memory

3. **Rewrites `context/MEMORY.md`** with the fresh overview:
   - Empties the existing `context/MEMORY.md` entirely
   - Writes the generated overview into it: a clean, structured
     snapshot of the project state at this moment
   - Format: readable markdown with sections for project identity,
     TODO status, architecture snapshot, discrepancies found,
     and key observations

4. **Presents a structured overview** that includes:
   - Project name, version, purpose
   - Current TODO state (what's in progress, backlog, done)
   - What documentation is present vs missing
   - Any discrepancies found between docs and actual code
   - Key structural observations from code scan

### When to use

- At the start of a session to load project context
- When the user says "what's the state of the project?"
- Before starting work on a task to understand the codebase

---

## `docs update`

Scans the project code and regenerates or updates the `context/*.md` files
to match what's actually in the codebase.

### What it does

1. **Scans the project thoroughly:**
   - Backend routes: reads `backend/app/api/v1/` to find all endpoints
   - Backend models: reads `backend/app/models/` for all ORM models
   - Backend services: reads `backend/app/services/` for service layer
   - Backend repos: reads `backend/app/repositories/` for data access
   - Frontend pages: scans `frontend/app/` to find all routes
   - Frontend components: scans `frontend/components/` structure
   - Config files: reads `Makefile`, `compose.yml`, `package.json`,
     pyproject.toml, etc.

2. **Updates each context/*.md file:**
   - `architect.md` — architecture, layers, data flow, business rules,
     stack, background tasks
   - `backend.md` — models, services, repos, auth deps, key decisions,
     technical debt
   - `frontend.md` — pages, components, API client, maps, utilities
   - `ui.md` — component structure, layout blocks, theming
   - `commands.md` — Makefile targets and usage
   - `config.md` — code style, naming, env vars
   - `commit.md` — commit conventions
   - Keeps MEMORY.md and TODO.md unchanged (those aren't code docs)

3. **Also updates CLAUDE.md** if needed — the context file index should
   match what actually exists.

### File format conventions

Each context/*.md file should be:
- **Concise but thorough** — enough to understand the system without
  reading every source file
- **Structure-focused** — list directories, key files, relationships
- **Code-validated** — every claim verifiable against actual code
- Update `Updated: YYYY-MM-DD` line (or drop one)
- **90–120 lines max** per file

### When to use

- After significant code changes (new models, routes, refactors)
- When context docs are missing, empty, or clearly stale
- When the user says "update docs" or "بروزرسانی مستندات"

### Files to update

| File | Source to scan | Skip |
|------|---------------|------|
| architect.md | compose.yml, Makefile, backend/api/, core/ | — |
| backend.md | backend/app/models/, services/, repos/, api/, schemas/ | — |
| frontend.md | frontend/app/, components/, hooks/, lib/, types/ | — |
| ui.md | frontend/components/ui/, layout patterns | — |
| commands.md | Makefile | — |
| config.md | .env*, Makefile, pyproject.toml | — |
| commit.md | .git, .pre-commit-config.yaml | — |
| MEMORY.md | — | Always skip |
| TODO.md | — | Always skip |

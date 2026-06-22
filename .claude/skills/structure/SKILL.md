---
name: structure
description: >
  Set up or update the Claude project structure for any repository. Scans the
  project source code to understand its technology stack, architecture, and
  components, then creates or updates CLAUDE.md, VERSION, TODO.md, the context/
  directory (architect.md, backend.md, frontend.md, commands.md, commit.md,
  config.md, ui.md, MEMORY.md), and .claude/settings.json. Adapts the generated
  files to match the actual project — only creates what's relevant (e.g., skips
  frontend.md for a pure Python project). Triggered by the user saying
  "/structure", "ساختار", "project structure", "setup project", "راه‌اندازی
  پروژه", "set up claude", "initialize project", "project setup",
  "ایجاد ساختار پروژه", at the start of a new project, or whenever the
  existing Claude project structure needs updating.
---

# structure

Set up or update the Claude project structure (CLAUDE.md, TODO.md, VERSION,
context/*.md, .claude/settings.json) by scanning the project source code.

## When to use

- The user types `/structure` or says "ساختار"
- The user wants to set up a new project for working with Claude
- The user wants to update an existing project's Claude structure
- A session starts and the project lacks proper Claude documentation
- The project has new components/modules that aren't documented yet

## Workflow

The skill follows these steps **in order**. If any step fails, explain the
issue to the user and offer guidance.

### Step 1: Scan the project

First, get a broad view of the project by scanning its root directory and
key configuration files:

```bash
# List root directory
ls -la

# Check key config files
cat package.json 2>/dev/null || cat pyproject.toml 2>/dev/null || cat Cargo.toml 2>/dev/null || cat go.mod 2>/dev/null
cat Makefile 2>/dev/null || cat Rakefile 2>/dev/null || cat Justfile 2>/dev/null
cat compose.yml 2>/dev/null || cat docker-compose.yml 2>/dev/null
cat .env.example 2>/dev/null || cat .env.sample 2>/dev/null
```

Then dig deeper to understand the directory structure:

```bash
# Explore project directories
find . -maxdepth 3 -type d | head -60
```

**As you scan, answer these questions:**

1. **What kind of project is this?** (web app, CLI tool, library, monorepo, etc.)
2. **What's the tech stack?** (languages, frameworks, databases)
3. **What's the directory structure?** (monorepo with workspaces, single app, etc.)
4. **What are the main source directories?** (src/, app/, lib/, backend/, frontend/)
5. **What build tools / task runners are used?** (Make, npm scripts, Docker, etc.)
6. **What's the project's purpose?** (from package.json description, README,
   comments, or conversation context)

Determine the **project type**:

| Project type | Indicators |
|---|---|
| **Backend-only** | Python/FastAPI, Go, Rust, or similar backend code with no frontend app |
| **Frontend-only** | React/Vue/Svelte app, no API code of its own |
| **Full-stack** | Both backend and frontend directories (e.g., `backend/` + `frontend/`) |
| **Library/Package** | Python package, npm package, crate — meant to be consumed, not deployed |
| **CLI tool** | Has a bin/ or cli.py, or similar entry point |
| **Monorepo** | Multiple apps/packages, workspaces in package.json or similar |

### Step 2: Read any existing structure

If CLAUDE.md, TODO.md, or context/*.md files already exist, read them to
understand what's already documented. This prevents overwriting valuable
content with generic templates.

Be selective — don't read dozens of files. Focus on:
- `CLAUDE.md` (if exists)
- `context/` directory listing + a quick scan of each file's first 5-10 lines
- `TODO.md` (if exists)
- `VERSION` (if exists)

### Step 3: Determine what to create and update

Build a plan of what needs to happen. For existing files that are already
well-populated, **preserve their content and only update sections that are
outdated or incomplete**. For missing files, create them based on your scan.

**Important:** This is not a one-shot generation — you're building a living
structure. Be conservative with content that requires deep code analysis
(like listing every route or component). Focus on **structure, patterns, and
key entry points** that Claude needs to work effectively.

### Step 4: Create/update the files

Create or update files in the following priority order. Always create the
directory structure first:

```bash
mkdir -p context .claude/skills
```

Then handle each file. Present what you're about to do to the user before
making changes — something like:

> 📋 **Structure plan:**
> - ✅ CLAUDE.md — Create (project overview)
> - 🆕 context/architect.md — Create (full-stack architecture)
> - 🆕 context/backend.md — Create (Python/FastAPI backend)
> - 🆕 context/frontend.md — Create (React/Next.js frontend)
> - 🆕 context/commands.md — Create (make targets)
> - 🆕 context/commit.md — Create (commit conventions)
> - 🆕 context/config.md — Create (code style)
> - 🆕 context/ui.md — Create (UI patterns)
> - 🆕 context/MEMORY.md — Create (session memory)
> - 🆕 VERSION — Create (0.1.0)
> - 🆕 TODO.md — Create (task tracking)

Wait for the user to confirm before writing files.

---

## File generation guidelines

Below is the content each file should contain. Adapt the level of detail
based on what you learned during the scan.

### CLAUDE.md (`CLAUDE.md`)

The single most important file — provides high-level orientation.

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working
with code in this repository.

## Project

**<Project Name>** — <One-line description>.
**Version:** <X.Y.Z> (single truth in `VERSION` file at repo root)

## Context Files (`context/`)

| File | Content |
| --- | --- |
| [architect.md](context/architect.md) | Layers, data flow, business rules, stack |
| [backend.md](context/backend.md) | Models, services, repos, API docs |
| [frontend.md](context/frontend.md) | Pages, components, API client, patterns |
| [commands.md](context/commands.md) | Makefile / script reference |
| [commit.md](context/commit.md) | Conventional Commits type/scope rules |
| [config.md](context/config.md) | Comment style, naming, env vars |
| [ui.md](context/ui.md) | Component structure, layout blocks, theming (frontend only) |
| [MEMORY.md](context/MEMORY.md) | Session memory index |
| [TODO.md](TODO.md) | Task tracking and backlog |
```

- Leave out the `ui.md` row if the project has no frontend
- If the project doesn't use Make, skip the commands.md row — or keep it
  if there are relevant npm/pip scripts worth documenting
- List the context files **that actually exist** (after creation)

### VERSION (`VERSION`)

A single-line version file. If none exists, start at `0.1.0`.
If the project already has a version (e.g., in package.json or pyproject.toml),
extract it and write it here as the single source of truth.

```
0.1.0
```

### TODO.md (`TODO.md`)

Task tracking file. If one already exists with substantial content, **preserve
it** and only suggest improvements to the user. If creating from scratch:

```markdown
# TODO

Updated: YYYY-MM-DD

## Backlog

- [ ] **Initial setup** — Placeholder. Replace with real tasks.

## In Progress

## Done
```

### context/architect.md

Documents the high-level architecture. Should cover:

```
## Layers  (table of directories → responsibility)
## Data Flow  (Client → API → Service → Repository → DB)
## Business Rules  (key rules as a table)
## Stack  (component → technology table)
## Background Tasks  (if any)
```

- Focus on what's **observable from scanning the codebase** — don't invent
  business rules you can't verify
- Use the Makefile or scripts to identify build/deploy patterns
- Extract the stack from package.json / pyproject.toml / compose.yml

### context/backend.md

Only create if the project has a backend. Should cover:

```
## Stack
## Directory  (tree or table of backend directories)
## Database Models  (entity → table → key fields table)
## Services  (service → file → key methods table)
## Auth  (auth mechanisms, deps, endpoints table)
## Key Design Decisions  (important patterns, conventions)
## Known Technical Debt  (if scan reveals any)
```

### context/frontend.md

Only create if the project has a frontend. Should cover:

```
## Stack
## Directory  (tree or table of frontend directories)
## API Client  (how API calls work)
## Key Patterns  (state management, routing, forms)
## Map Components  (if any maps)
## Persian/Arabic Text Utilities  (if any RTL/i18n)
## Dashboard Pages  (table of routes → role → content)
## UI Patterns  (common patterns observed)
```

### context/commands.md

Documents the project's task runner / scripts. Adapt based on what's found:

```
## Development
## Docker
## Database
## Code Quality
## Testing
## Versioning
## Install & Maintenance
```

For each section, extract commands from the Makefile, package.json scripts,
or justfile. If the project has no task runner, document the common commands
manually and suggest creating a Makefile.

### context/commit.md

Documents commit message conventions. Provide a solid default based on
Conventional Commits that the user can modify:

```
## Format
<type>(<scope>): <description>

## Types
## Scopes
## Body & Footer
```

### context/config.md

Documents code style conventions observed in the project. Should cover:

```
## Comment Style  (observed patterns per language)
## Naming Conventions  (snake_case, camelCase, kebab-case per language)
## Environment Variables  (key vars from .env* files)
## File Naming  (convention per language)
## Git Hooks  (if any pre-commit hooks detected)
```

### context/ui.md

Only create if the project has a frontend with UI components. Documents:

- **Component library** (shadcn, Material UI, Chakra, custom, etc.)
- **Theming** (dark mode, colors, fonts)
- **Layout patterns** (dashboard, public pages, auth pages)
- **Recurring UI patterns** (search bars, tables, dialogs, empty states)
- **Component conventions** (props, styling approach)
- **CSS/Tailwind conventions**

Be concise. Focus on high-level patterns rather than listing every component.
If the project uses shadcn/ui, link to the upstream docs rather than
re-documenting common components.

### context/MEMORY.md

Session memory index. Start with:

```markdown
# Memory

## Recent Commits
```

This file gets populated over time as the commit skill or user updates it.
It starts minimal.

### .claude/settings.json

Settings for the Claude session. Create with sensible defaults:

```json
{
  "permissions": {
    "allow": []
  },
  "hooks": {},
  "enabledPlugins": {}
}
```

- Don't guess at permissions or hooks the user might want
- If the project uses local settings already (in `.claude/settings.json`),
  preserve them and only add structure-specific suggestions

---

## Edge cases

### Project already has partial structure

If some files exist but others don't, **only create the missing ones** and
**update existing ones** where your scan reveals gaps. Never overwrite
content that's already well-populated — preserve the user's work.

If there's a `context/` directory with some files but not others (e.g.,
architect.md exists but backend.md doesn't), only create the missing ones
and read the existing ones to ensure consistency.

### Empty project (no code yet)

If the project is essentially empty (just package.json or similar), create
the structure with placeholder content and note in the summary that some
sections will need to be filled in as code is written. Don't fabricate
details about architecture or models that don't exist yet.

### Monorepo

For monorepos (workspace-based projects with multiple apps/packages):
- Note the workspace structure in CLAUDE.md
- Create context files for each major sub-project when they have distinct
  stacks (e.g., `context/frontend.md` for the web app, `context/backend.md`
  for the API)
- Create a single `architect.md` that covers the overall architecture

### Makefile / scripts not found

If the project has no Makefile or equivalent, suggest creating one but
don't force it. Document the relevant commands from package.json scripts
or equivalent in commands.md. If there are no scripts at all, create a
minimal commands.md with common development commands.

### Language/framework detection fails

If you can't confidently determine the tech stack (unusual or custom setup),
ask the user to clarify rather than guessing wrong. Say something like:
"I found X structure but I'm not sure about the stack — could you confirm
what technologies this project uses?"

### README already exists

If there's a README.md, read it for project description and purpose. Use
its description in CLAUDE.md rather than duplicating effort.

### Existing TODO.md with substantial content

Preserve what's there. Only suggest structural improvements (like adding
section headers or date stamps). Never delete someone's task list.

### .claude/settings.json exists

If settings already exist, don't overwrite them. Only update if the
permissions/hooks are clearly missing something essential.

---

## Summary output

After creating/updating the structure, present a clear summary:

> ✅ **Structure update complete**
>
> Created:
> - CLAUDE.md
> - VERSION
> - context/architect.md
> - context/backend.md
> - context/commands.md
> - context/commit.md
> - context/config.md
>
> Updated:
> - TODO.md (added date stamp, section headers)
>
> Skipped (already up-to-date):
> - context/frontend.md — no frontend found
> - context/ui.md — no frontend found
>
> ℹ️ Next steps: Review each context file for accuracy, then tell Claude
> to `/review` the project so it reads the new structure into memory.

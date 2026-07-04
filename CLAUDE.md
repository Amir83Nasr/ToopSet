# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ToopSet (توپ‌سِت)** — Online platform for booking sports courts in Qom, Iran.

- **Version:** 0.4.0 — single source of truth is the `VERSION` file at the repo root (see `make version-check` / `make version-bump`).

## Project-Specific Rules

### UI Numbers

All numbers displayed in the user interface **MUST** use **Persian digits** (e.g. `۱۲۳۴۵` instead of `12345`).

- Use the `toPersianDigits()` utility from `@/lib/utils` for every numeric value shown to users: prices, phone numbers, dates, counts, pagination, ratings, etc.
- **Exceptions:** raw values inside `<input>` fields, and LTR text that requires English digits for consistency (e.g. time format `HH:MM`).

### Section-Header Comments

Config, env, and infra files (`.env*`, `Makefile`, `Dockerfile`, `.pre-commit-config.yaml`, etc.) group related settings using a boxed comment header:

```text
# ── Redis (backend/.env) ──────────────────────────────────
```

- Use `#` (or the file's native comment token) followed by a space, `──` (two box-drawing dashes, U+2500), a space, the section title, then a run of `──` padding out to the surrounding lines' width.
- Include a short parenthetical for context when it helps (e.g. which file/env the section applies to, or a clarifying note like `(mock = no real gateway)`).
- Match the existing file's padding width and dash character exactly — don't mix plain hyphens (`-`) with box-drawing dashes (`─`) in the same file.
- Apply this style when adding new sections to files that already use it; don't retrofit files that don't.

## Agent Permissions

Assume full project-level permission to:

- Read, create, modify, refactor, or delete any file in the repository.
- Add dependencies when necessary.
- Update configuration, database models, and migrations.
- Update frontend and backend code.
- Add or modify tests.
- Improve security, performance, and maintainability.
- Execute any project-related command required for development, testing, debugging, formatting, linting, migrations, builds, or deployments.

## Development Workflow

### Pre-Commit Verification (Mandatory)

**No commit may be created until all pre-commit checks pass.** This applies to every commit, without exception.

1. Run `make precommit` (wraps `pre-commit run --all-files`, covering Ruff format/lint for the backend and Prettier/ESLint for the frontend, plus the general hygiene hooks in `.pre-commit-config.yaml`).
2. Fix every reported issue.
3. Re-run `make precommit` until it exits with no errors.
4. Only create the commit once the repository is clean.
5. **Never** bypass hooks with `--no-verify` or similar flags.

Before considering any task complete, also verify:

- The implementation compiles / builds successfully (`make build`, `make typecheck`).
- Linting passes (`make lint`).
- Formatting is correct (`make format`).
- Existing tests continue to pass (`make test`).
- New functionality is covered by appropriate tests.
- No obvious regressions have been introduced.

Only commit after all of the above are green.

### Commit Guidelines

This repository follows the **[Conventional Commits](https://www.conventionalcommits.org/)** specification.

**Format:**

```text
<type>(optional-scope): short summary

optional body

optional footer
```

**Allowed types:**

| Type       | When to use it                                                            |
| ---------- | ------------------------------------------------------------------------- |
| `feat`     | A new feature for the user                                                |
| `fix`      | A bug fix                                                                 |
| `refactor` | Code change that neither fixes a bug nor adds a feature                   |
| `perf`     | Change that improves performance                                          |
| `docs`     | Documentation-only changes                                                |
| `test`     | Adding or correcting tests                                                |
| `build`    | Changes to build system or dependencies (npm, pip, Docker, etc.)          |
| `ci`       | Changes to CI configuration/scripts                                       |
| `chore`    | Routine maintenance that doesn't fit other types (tooling, configs, etc.) |
| `style`    | Formatting/whitespace changes that don't affect code meaning              |
| `revert`   | Reverts a previous commit                                                 |

**Examples:**

```text
feat(courts): add multi-select sport filter with mono-color badges

fix(map): add CartoDB tile fallback for Neshan 204 errors

refactor(courts): admin-style pagination and shadcn card redesign

docs(project): synchronize documentation with current codebase state

perf(map): reduce tile fallback delay to 1s and add DNS prefetch
```

**Best practices for atomic commits:**

- One logical change per commit — avoid bundling unrelated fixes/features.
- Use a scope (e.g. `courts`, `map`, `dashboard`, `config`) that matches the affected module/feature area.
- Keep the summary line under ~72 characters, written in the imperative mood ("add", not "added"/"adds").
- Use the body to explain _why_, not just _what_, when the change isn't self-evident.
- Reference issues/tickets in the footer when applicable.

## Reporting

After every completed task, provide:

- **Summary**
- **Root Cause** (if applicable)
- **Changes Made**
- **Files Modified**
- **Tests Performed**
- **Final Status**
- **Remaining Recommendations** (if any)

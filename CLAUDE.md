# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ToopSet (توپ‌سِت)** — Online platform for booking sports courts in Qom, Iran.
**Version:** 0.4.0 (single truth in `VERSION` file at repo root)

## Communication

- All conversations, responses, explanations, reports, summaries, documentation, comments, commit messages, and generated text must be written in **English**.
- Always respond in English, regardless of the language used by the user, unless the user explicitly requests another language.
- Internally interpret non-English requests if necessary, but all visible output must remain in English.

## UI Numbers

All numbers displayed in the user interface MUST be in **Persian digits** (e.g. `۱۲۳۴۵` instead of `12345`). Use the `toPersianDigits()` utility from `@/lib/utils` for every numeric value shown to users: prices, phone numbers, dates, counts, pagination, ratings, etc. The only exceptions are raw data in `<input>` fields and LTR text that needs English digits for consistency (e.g. time format `HH:MM`).

## Working Style

- Act as a Senior Software Engineer.
- Prefer production-ready implementations over quick fixes.
- Always identify the root cause before implementing a solution.
- Avoid workarounds whenever a proper fix is possible.
- Follow existing project architecture and coding conventions.
- Keep the codebase clean, maintainable, and consistent.
- Minimize regressions.

## Permissions

Assume full project-level permission to:

- Read any file in the repository.
- Modify any existing source file.
- Create new files.
- Delete obsolete files.
- Refactor existing code.
- Add dependencies when necessary.
- Update configuration files.
- Update database models and migrations.
- Update frontend and backend.
- Add or modify tests.
- Improve security, performance, and maintainability.
- Execute any project-related command required for development, testing, debugging, formatting, linting, migrations, builds, or deployments.

Do not interrupt your workflow by asking for confirmation before making engineering decisions or project modifications.

Only ask for clarification when there is a genuine business requirement ambiguity that cannot be resolved by inspecting the existing codebase.

## Quality Standards

Before considering any task complete, ensure:

- The implementation compiles successfully.
- Linting passes.
- Formatting is correct.
- Existing tests continue to pass.
- New functionality is covered by appropriate tests.
- No obvious regressions have been introduced.

## Reporting

After every completed task, provide:

- **Summary**
- **Root Cause** (if applicable)
- **Changes Made**
- **Files Modified**
- **Tests Performed**
- **Final Status**
- **Remaining Recommendations** (if any)

## Context Files (`context/`)

| File                                 | Content                                                           |
| ------------------------------------ | ----------------------------------------------------------------- |
| [architect.md](context/architect.md) | Layers, data flow, business rules, stack, background tasks        |
| [backend.md](context/backend.md)     | Models, services, repos, auth deps, key decisions, technical debt |
| [frontend.md](context/frontend.md)   | Pages, components, API client, maps, Persian utilities            |
| [commands.md](context/commands.md)   | Full Makefile reference                                           |
| [commit.md](context/commit.md)       | Conventional Commits type/scope rules                             |
| [config.md](context/config.md)       | Comment style, naming, env vars, Makefile structure               |
| [ui.md](context/ui.md)               | Component structure, layout blocks, theming                       |
| [MEMORY.md](context/MEMORY.md)       | Session memory index                                              |
| [TODO.md](TODO.md)                   | Task tracking and backlog                                         |

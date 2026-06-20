---
name: brainstorm
description: >
  Generate ideas for the next development steps of the active project. Trigger
  when the user says "/brainstorm", "بارش فکری", "brainstorm", "what's next",
  "next steps", "what should I build next", or any request to generate project
  ideas or plan the next phase. Reads CLAUDE.md + context/*.md + TODO.md AND
  independently scans the project source code to understand the real structure,
  then proposes concrete backlog items for user approval. If context docs are
  missing, scans the project and asks the user questions to fill the gaps. Also
  useful when starting a new session — "check the project state and suggest
  what to work on".
---

# brainstorm

A skill for ideating the next phase of development for the active project.

## When to use

- The user types `/brainstorm` or asks "what's next for this project?"
- The user says "بارش فکری" or "brainstorm" or "ایده بده برای مراحل بعد"
- The user starts a new session and wants to know what to work on next
- The user wants fresh ideas for project improvements

## What this skill does

### Phase 1: Understand the project

1.  **Read the documented state** — reads `CLAUDE.md` (which references
    `context/`), then reads every `.md` file inside `context/` to understand
    architecture, backend, frontend, UI, config, commit conventions, and
    commands.

2.  **Scan the actual project** — independently explores the project's source
    code to discover its real structure:
    - Backend: checks directory layout (api/, models/, services/,
      repositories/, schemas/, core/), key files, routing patterns, database
      models, and service layer.
    - Frontend: checks the framework (Next.js App Router), pages, components
      structure, hooks, lib utilities, and types.
    - Config: reads `package.json`, `Makefile`, `Dockerfile`/`compose.yml`,
      and other config files to understand tooling.
    - Uses the findings to *validate, supplement, or correct* what the
      context docs say — the actual code always wins.

3.  **Handle missing context** — if `context/` files are absent, empty, or
    clearly stale:
    - Scans the project thoroughly to reconstruct an understanding.
    - Asks the user targeted questions to fill gaps:
      - "این پروژه چیه و هدفش چیه؟" (What is this project?)
      - "چه تکنولوژی‌هایی استفاده شده؟" (What tech stack?)
      - "آیا کاربر نهایی داره؟ کی استفاده می‌کنه؟" (Who are the users?)
      - "الان کجای کار هستیم؟" (Where in development are we?)
      - And any other questions needed to generate relevant ideas.

4.  **Read TODO.md** — reads `TODO.md` from the project root (not `context/`).
    If it doesn't exist, creates it with the standard structure (see below).

### Phase 2: Generate and add ideas

5.  **Analyze the gap** — compares what the project *has* (from context docs
    and code scan) against what it could *have*: features that are natural
    next steps, gaps in the domain model, UX improvements, performance work,
    testing gaps, infrastructure needs, or technical debt.

6.  **Propose ideas one-by-one** — presents 3–7 concrete ideas to the user.
    Each idea includes:
    - **Title** — a short, clear name (in Persian or English matching the
      project's bilingual style)
    - **Rationale** — why this is valuable now, grounded in the project's
      actual architecture or domain
    - **Scope hint** — small/medium/large with rough estimate of what files
      it touches

    The user approves or rejects each one individually.

7.  **Update TODO.md** — adds all approved items to the `## Backlog` section
    of `TODO.md`, then updates the `Updated:` date. Preserves existing
    backlog items that weren't discussed.

8.  **Print a summary** — tells the user what was added and invites them to
    start working on something.

## Project understanding principles

- **Code over docs** — the actual source code is always the ground truth.
  Context docs inform you, but scanning the real code *validates and
  supplements* them. If docs are empty or missing, the code scan is your
  primary source.
- **Be thorough in scanning** — check key structural markers: routing files
  (backend routes, frontend pages), config files (package.json, Makefile,
  compose.yml), model/service definitions, and component trees. A quick
  directory listing (`ls -R` on key dirs) is better than guessing.
- **Ask when stuck** — if you can't determine something important from code
  or docs (project purpose, target users, deployment status), ask the user.
  A few targeted questions prevent irrelevant ideas.
- **Don't skip familiar patterns** — even if you recognise the stack (e.g.
  Next.js + FastAPI), still scan it. The specifics matter: what pages exist,
  what models are defined, what auth is configured.

## Idea generation principles

- **Don't suggest what's already there** — check Backlog, In Progress, and
  Done sections of TODO.md for duplicates.
- **Be concrete** — no vague "improve performance". Instead: "Cache court
  search results in Redis with 5-minute TTL" or "Add skeleton loading to
  court cards during map/court data fetch".
- **Be grounded** — ideas must relate to the *actual* codebase you scanned.
  A fake or assumed feature is worse than no idea.
- **Cover different domains** — mix frontend, backend, UX, testing,
  infrastructure, or analytics across the ideas.
- **Re-read context or code if unsure** — if you need to verify whether
  something already exists, don't guess — re-read the file.
- **Prioritize user-facing value** — favor features users will notice over
  pure internal refactoring, unless the tech debt is blocking something.

## TODO.md structure

The file at the project root uses this format:

```markdown
# TODO

Updated: YYYY-MM-DD

## Backlog

- [ ] Item one
- [ ] Item two

## In Progress

- [ ] Current task (started: YYYY-MM-DD)

## Done

- [x] Completed task (completed: YYYY-MM-DD)
```

When adding approved items, insert them at the top of the Backlog section
(most recent first). Always update the `Updated:` date line.

---
name: review
description: >
  Load the full project picture: reads all context/*.md, CLAUDE.md, TODO.md,
  and MEMORY.md, then independently scans the project source code to validate
  and supplement the docs. Rewrites context/MEMORY.md with the fresh overview
  snapshot, and presents a structured summary of project state to the user.
  Trigger when the user says "review", "مرور", "review project", "project
  review", "code review", "مرور پروژه", "وضعیت پروژه", "check the project",
  at the start of a session, or when the user needs a complete understanding
  of the current project state before working.
---

# review

Load the full project picture into the conversation.

## What it does

1. **Reads all documentation files:**
   - `CLAUDE.md` — project overview, version, context file index
   - `context/*.md` — architecture, backend, frontend, UI, config,
     commands, commit conventions
   - `TODO.md` — current task tracking (backlog, in progress, done)
   - `context/MEMORY.md` — existing session memory (read first,
     then overwrite — see step 3)

2. **Independently scans the project code** to *validate and supplement*
   the documentation:
   - Backend structure (api/, models/, services/, repositories/,
     schemas/, core/, migrations/)
   - Frontend structure (app/ pages, components/, hooks/, lib/, types/)
   - Config files (package.json, Makefile, compose.yml, .env*)
   - Key code patterns (routing, auth, models, components)

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

## When to use

- At the start of a session to load project context
- When the user says "what's the state of the project?"
- Before starting work on a task to understand the codebase
- When the user asks for a project review or overview

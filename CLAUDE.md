# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ToopSet (توپ‌سِت)** — Online platform for booking sports courts in Qom, Iran.
**Version:** 0.4.0 (single truth in `VERSION` file at repo root)

## Language

Conversation and thinking output MUST be in **Persian (Farsi)**, including planning,
analysis, and all narrative text. The only English allowed is in code identifiers,
commit messages (per commit conventions), and file names.

## UI Numbers

All numbers displayed in the user interface MUST be in **Persian digits** (e.g.
`۱۲۳۴۵` instead of `12345`). Use the `toPersianDigits()` utility from
`@/lib/utils` for every numeric value shown to users: prices, phone numbers,
dates, counts, pagination, ratings, etc. The only exceptions are raw data in
`<input>` fields and LTR text that needs English digits for consistency (e.g.
time format `HH:MM`).

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

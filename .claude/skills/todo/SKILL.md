---
name: todo
description: >
  Manage the project's TODO.md directly from conversation. Commands: "todo
  backlog <task>" adds a task to Backlog; "todo inprogress <task>" adds a task
  to In Progress; "todo done" moves the current In Progress task to Done; "todo
  start" lists backlog items and lets the user pick one to move to In Progress.
  Trigger when the user says "todo", "add to list", "mark as done", "start
  working on", "جدید به لیست اضافه کن", "انجام شد", "شروع کن", "بک لاگ",
  "inprogress", or anything related to managing the project's task list. Reads
  and writes TODO.md at the project root. All task names are saved in English.
---

# todo

Manage the project's TODO.md file — add, start, and complete tasks directly
from conversation.

## When to use

- The user types "todo backlog <task>" — add to Backlog
- The user types "todo inprogress <task>" — add to In Progress
- The user types "todo done" — mark current In Progress as Done
- The user types "todo start" — pick a backlog item to start
- The user talks about tasks, todos, or what to work on next

## Rules

- **All task names in English** — always convert Persian task names to English
  (e.g. "رفع باگ لاگین" → "fix login bug")
- **Remove from old section when moving** — when a task moves from one state
  to another (Backlog → In Progress, In Progress → Done), delete it entirely
  from the old section — no duplicates, no dead entries
- **Guess topic from context** — if the user doesn't provide a task description,
  infer the topic from the recent conversation or what you were just working on,
  and ask the user to confirm before adding

## Commands

### `todo backlog <task description>`

Adds a new task to `## Backlog`.

- If the user provides a description (e.g. "todo backlog fix login bug"),
  add "fix login bug" to Backlog without asking.
- If the user just says "todo backlog" without a description, infer the
  topic from the recent conversation/current work, then ask:
  > "Add this to backlog: `<inferred task>`? (yes/no)"
  Only add if confirmed.
- If the task already exists in Backlog, tell the user it's already there.
- If it exists in In Progress or Done, tell the user instead of duplicating.

**Format:**
```
- [ ] fix login bug
```

### `todo inprogress <task description>`

Adds a new task to `## In Progress`.

- If the user provides a description, use it directly.
- If the user just says "todo inprogress" without a description, infer the
  topic from context and ask for confirmation.
- If the task is already in Backlog, remove it from Backlog first, then add to
  In Progress with `(started: YYYY-MM-DD)`.
- If it already exists in In Progress, tell the user.
- If it exists in Done, ask if they want to re-open it.

**Format:**
```
- [ ] fix login bug (started: 2026-06-20)
```

### `todo done`

Marks the current in-progress task as done.

- If `## In Progress` has items, take the top (or only) item:
  - Change `[ ]` to `[x]`, append `(completed: YYYY-MM-DD)`
  - Delete it from In Progress
  - Place it at the top of `## Done`
- If multiple items exist in In Progress, ask which one is done.
- If nothing is in In Progress, tell the user and suggest items from Backlog
  or using "todo start".

**Format:**
```
- [x] fix login bug (completed: 2026-06-20)
```

### `todo start`

Starts working on a backlog item.

- Lists all items in `## Backlog` with numbers:
  ```
  Backlog items:
  1. fix login bug
  2. add search feature
  3. write tests
  Which one do you want to start? (1-3)
  ```
- User picks a number (or says the name).
- **Deletes the selected item from `## Backlog`** entirely.
- Adds it to `## In Progress` with `(started: YYYY-MM-DD)` appended.
- If Backlog is empty, tell the user and offer to brainstorm new ideas.
- If there's already something in In Progress, ask if they want to finish
  it first (or use "todo done") before starting something new.

## TODO.md structure

The skill works with this format (at the project root):

```markdown
# TODO

Updated: YYYY-MM-DD

## Backlog

- [ ] Item one

## In Progress

- [ ] Current task (started: YYYY-MM-DD)

## Done

- [x] Completed task (completed: YYYY-MM-DD)
```

If TODO.md doesn't exist, create it with the standard sections.

## Edge cases

- **TODO.md not found** — create it from scratch with empty sections.
- **Multiple items in In Progress on "todo done"** — ask which one.
- **Backlog is empty on "todo start"** — suggest brainstorming or ask what
  to work on.
- **Nothing in In Progress on "todo done"** — tell the user and suggest
  starting something first.
- **Task already exists** — check all sections first. Don't duplicate. If
  moving between states, delete from the old section.
- **Date updates** — keep the `Updated: YYYY-MM-DD` line current.

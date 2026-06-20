---
name: todo
description: >
  Manage the project's TODO.md directly from conversation. Trigger when the
  user says "todo add <task>", "todo done", "todo start", or any variant like
  "add to todo", "mark as done", "start working on", "جدید به لیست اضافه کن",
  "انجام شد", "شروع کن", or anything related to managing the project's task
  list. Reads and writes TODO.md at the project root. Three commands: "todo
  add X" adds X to In Progress; "todo done" moves the current task from In
  Progress to Done; "todo start" lists backlog items and lets the user pick
  one to move to In Progress.
---

# todo

Manage the project's TODO.md file — add, start, and complete tasks directly
from conversation.

## When to use

- The user types "todo add <task>" — they want to add a new task to In Progress
- The user types "todo done" — they want to mark the current in-progress task as done
- The user types "todo start" — they want to pick a backlog item to start working on
- The user talks about tasks, todos, or what to work on next in a structured way
- The user says things like "این رو بذار تو لیست کارها", "انجامش بده", "شروع کن روی"

## Commands

### `todo add <task description>`

Adds a new task to the `## In Progress` section of TODO.md.

- If the user provides a task description (e.g. "todo add fix login bug"),
  add "fix login bug" to In Progress.
- If the user just says "todo add" without a description, ask them what
  task they want to add.
- If the task is already in Backlog, move it to In Progress instead of
  duplicating (assume they want to start it now).
- If the task is already done, ask if they want to re-open it.

**Expected format:**

```
- [ ] fix login bug (started: 2026-06-20)
```

### `todo done`

Marks the current in-progress task as done.

- Takes the top item (or only item) in `## In Progress`, changes `[ ]`
  to `[x]`, and appends `(completed: YYYY-MM-DD)`.
- Moves it to the top of `## Done` section.
- If multiple items exist in In Progress, ask the user which one is done.
- If nothing is in In Progress, tell the user and suggest items from Backlog.
- If In Progress is empty but there are items in Backlog, suggest using
  "todo start" first.

**Expected format:**

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
- **Removes the selected item from `## Backlog`** entirely (not just
  marking it — the line is deleted from the Backlog list).
- Adds it to `## In Progress` with `(started: YYYY-MM-DD)` appended.
- If Backlog is empty, tell the user and offer to brainstorm new ideas.
- If there's already something in In Progress, ask if they want to finish
  it first (or use "todo done") before starting something new.

## TODO.md structure

The skill works with this format (at the project root):

```markdown
# TODO

## Backlog

- [ ] Item one
- [ ] Item two

## In Progress

- [ ] Current task (started: YYYY-MM-DD)

## Done

- [x] Completed task (completed: YYYY-MM-DD)
```

If TODO.md doesn't exist, create it with the standard sections.

## Edge cases to handle

- **TODO.md not found** — create it from scratch with empty sections.
- **Multiple items in In Progress** — ask which one to mark done.
- **Backlog is empty on "todo start"** — suggest brainstorming (/brainstorm)
  or ask the user what they want to work on.
- **Nothing in In Progress on "todo done"** — tell the user and suggest
  they start something first.
- **"todo add" with no task** — ask for the task description instead of
  silently doing nothing.
- **Task already exists** — check all sections to avoid duplicates. If a
  task is already in Backlog and user says "todo add", move it to In Progress
  instead.
- **Date updates** — if the file has an `Updated: YYYY-MM-DD` line, keep it
  current. If not, leave the format as-is.

## Persian support

Since this is a Persian project, users may speak in Persian or mix languages:

- "todo add رفع باگ لاگین" → add "رفع باگ لاگین" to In Progress
- "todo done" → same as English
- "todo start" or "شروع کن" → same behavior
- When listing items to the user, use the language they're speaking in
- Keep the actual TODO.md content in whatever language the task name is in

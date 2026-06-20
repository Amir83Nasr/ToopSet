---
name: commit
description: >
  Auto-commit helper for the ToopSet project. Trigger when the user says
  "commit", "کامیت", "/commit", "commit changes", "commit this", "make a
  commit", "commit my changes", "کامیت کن", "بیا کامیت کنیم", or any request
  to create a git commit with a Conventional Commits style message. The skill
  first drafts a commit message based on the project's commit conventions in
  context/commit.md, shows it to the user for approval, *then* runs pre-commit
  checks on the approved changes, and finally commits. Always use this when
  the user asks to commit changes, even if they also mention a specific commit
  message — show your draft for approval rather than committing directly.
  Before the final commit, updates TODO.md (marks task as Done or adds
  it) and context/MEMORY.md (records the latest commit) so these
  changes are included in the commit itself.
---

# commit

Auto-commit helper for the ToopSet project.

## When to use

- The user types `/commit` or "commit" or "کامیت"
- The user says "commit changes", "commit this", "commit my work",
  "بیا کامیت کنیم", "تغییرات رو کامیت کن", "کامیت بزن"
- The user provides a partial message idea but wants a proper
  Conventional Commits message — always draft and show for approval
  rather than committing directly

## Workflow

The skill follows these steps **in order**. If any step fails and cannot
be auto-resolved, stop and explain the issue to the user.

### Step 1: Check git status

Run `git status --short` to see what's staged and unstaged.

- If nothing to commit (clean working tree), tell the user and stop.
- If there are unstaged changes, ask the user if they want to:
  a) Stage everything (`git add -A`) and proceed
  b) Stage only specific files
  c) Cancel
- If there are staged changes already, note them — they're the focus.

**Important:** always check with the user about unstaged changes before
continuing. Don't auto-stage everything without asking.

### Step 2: Review changes and draft commit message

Review all staged changes. Read `context/commit.md` to understand
the project's commit conventions (types, scopes).

Generate a commit message in the format:
```
<type>(<scope>): <description>

<body (if needed)>
```

Use this decision guide:

1. **Type** — choose from commit.md types:
   - `feat` — new feature visible to the user
   - `fix` — bug fix
   - `refactor` — code change with no feature/fix behaviour change
   - `chore` — maintenance, tooling, deps
   - `docs` — documentation only
   - `style` — formatting, linting (no logic change)
   - `test` — adding/updating tests
   - `perf` — performance improvement

2. **Scope** — choose from commit.md scopes:
   - `auth` — authentication, registration, login
   - `courts` — court listing, detail, CRUD
   - `booking` — booking create, pay, cancel
   - `map` — Neshan map components, markers
   - `dashboard` — dashboard pages, sidebar
   - `api` — backend endpoints, services
   - `db` — database models, migrations
   - `ui` — shadcn components, styling
   - `config` — Makefile, env, Docker, CI

3. **Description** — short imperative present tense, lowercase,
   no period at the end. Max ~72 chars.

4. **Body (optional)** — only if the change needs explanation.
   Explain *what* and *why*, not *how*. The body **must also be
   in English** — the entire commit message (title + body) must
   be English-only per project convention.

### Step 3: Show the message to the user

Display the proposed commit message clearly. Something like:

```
📝 Proposed commit message:

  feat(courts): add sport filter with multi-select badges

  Multi-select sport filter with mono-color badge display on court cards.

────────────────────────────────────
Changes staged:
  M frontend/components/court-filter.tsx
  M frontend/lib/hooks/use-courts.ts
  A frontend/components/sport-badge.tsx
────────────────────────────────────

Commit this? (yes / edit / cancel)
```

- **"yes"** → proceed to pre-commit (Step 4)
- **"edit"** → ask what to change, update based on their feedback,
  then show again for re-approval
- **"cancel"** → abort, don't commit

### Step 4: Run `make precommit`

Now that the user has approved the message, run `make precommit`
(which executes `pre-commit run --all-files`).

- If it passes (exit code 0), proceed to the actual commit (Step 5).
- If it fails (exit code non-zero), **try to fix the issues**:
  1. Check the error output to understand what failed
  2. Apply automated fixes where possible (Ruff can auto-fix,
     Prettier reformats, etc.)
  3. Re-stage fixed files
  4. Run `make precommit` again
  5. If it keeps failing after 2 retries, or if the errors are
     structural (type errors, logical bugs), stop and inform the
     user of the remaining errors so they can fix them manually.
     Don't modify logic or types on your own — only fix formatting,
     lint, whitespace, and other auto-fixable issues.
  6. After fixing, proceed to commit (Step 5). No need to ask for
     approval again — the user already approved the message.

### Step 5: Update TODO.md and MEMORY.md (pre-commit)

Before the final commit, update TODO.md and MEMORY.md so these
changes are included in the commit itself.

**Update TODO.md — mark relevant task as Done:**
1. Read `TODO.md` from the project root.
2. Check if the committed work matches an item in `## In Progress`:
   - Compare the commit topic/scope/description against task descriptions
   - If a match is found, move it to `## Done`:
     - Change `[ ]` to `[x]`, append `(completed: YYYY-MM-DD)`
     - Remove from In Progress, place at top of Done
     - Keep the **original Task name** (the more descriptive title from
       In Progress, not the commit message) — it already has good detail.
3. If nothing matches in In Progress, check `## Backlog` for a match
   and move it directly to Done (keeping the original Backlog description).
4. If no match anywhere in the Todo list, add a new entry to `## Done`
   with a **descriptive task name** based on the changes, not just the
   commit message. Convert the commit into a clear, detailed title:
   ```
   - [x] **Detailed task title** — What was actually done, the feature or fix
         in plain terms, with enough context to understand. (completed: YYYY-MM-DD)
   ```
   For example, instead of:
   ```
   - [x] feat(ui): add button component variants (completed: 2026-06-20)
   ```
   Write:
   ```
   - [x] **Add Button Component Variants** — Implement default, secondary,
         destructive, outline, ghost, and link variants for the Button shadcn
         component with proper sizing and state handling. (completed: 2026-06-20)
   ```
5. **Blank line separation** — Every Done item must be separated by a blank
   line. The existing Done section already has blank lines between items;
   preserve this format when adding new entries.
6. Always update the `Updated: YYYY-MM-DD` line if present.

**Update `context/MEMORY.md` — record the latest commit (keep up to 5):**
Read `context/MEMORY.md`, find the `## Recent Commits` section (or
`## Latest Commit` — migrate old format if needed).

Add the new commit at the top of the list:
```markdown
- **`<short-hash>`** — `<type>(<scope>): <description>` (YYYY-MM-DD)
```

If there are already 5 entries, remove the oldest (last) one so the
list stays at 5 maximum. Only remove entries when the list exceeds 5.

If the file currently uses the old single-entry format (`## Latest Commit`
with Hash/Message/Date fields), replace that section entirely with the
new multi-commit format:
```markdown
## Recent Commits

- **`<short-hash>`** — `<type>(<scope>): <description>` (YYYY-MM-DD)
```

Each entry is a single bullet line — no separate Hash/Message/Date fields.

After both files are updated, **stage them** with `git add -A`
so the changes are included in the upcoming commit.

### Step 6: Commit

```
git commit -m "<type>(<scope>): <description>" -m "<body>"
```

If body is empty, use a single `-m` flag. If body is present,
append it as a second `-m` (not as a single multi-line string).

End the commit message with the standard co-author line:
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

Then show the user the commit output:
```
✅ Committed as <short-hash>
   <type>(<scope>): <description>
```

## Edge cases

- **Pre-commit not installed** — tell the user to run
  `make install-precommit` first, then guide them.
- **Docker services needed** — some hooks may need DB or Docker
  running. If a hook fails because infra isn't up, warn the user
  but don't block — offer to skip pre-commit or start infra first.
- **Large changes (many files)** — the commit message should focus
  on the main theme. If changes span multiple scopes, pick the
  dominant scope. Use the body to note secondary changes.
- **Merge conflicts** — if `pre-commit` fails to modify files
  that are staged (e.g., it auto-fixes but the fix conflicts),
  reset with `git checkout -- <file>` and tell the user.
- **User says "use this message"** — if the user provides their
  own message, use it directly instead of drafting. Still show
  it for confirmation before running pre-commit.

## Persian support

Since this is a Persian project but commits must be English-only:
- All commit message text (title + body) is English — never Persian
- When talking to the user, use Persian if they spoke Persian
- The interaction language (asking for approval, explaining errors)
  is separate from the commit message language

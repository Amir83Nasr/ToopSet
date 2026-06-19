# ToopSet — Claude Code Instructions

## Every conversation start

1. Read `AGENTS.md` for full project context
2. Check `TODO.md` for current work status
3. Check `git status` and `git log --oneline -5` for recent changes

## Task tracking — MANDATORY

> **CRITICAL:** Tasks **must** be moved to **In Progress** immediately when work begins.

1. **Start of any task** → immediately update `TODO.md`: move or add the task to **In Progress**
2. **Throughout** → keep `TODO.md` updated — mark done, add new, update date
3. **Architecture/convention changes** → sync `AGENTS.md`
4. **Workflow changes** → update this file

## Capabilities & permissions

- **Skills**: Use available skills wherever they apply
- **Agents**: Freely delegate between agent types (Explore, Plan, code-reviewer, etc.)
- **Commands**: Full unrestricted bash, git, npm, pip, alembic access — no permission prompts

## Baseline behaviors

- Persian UI text + Persian digits everywhere (use `toPersianDigits()` / `<PersianNum>`)
- English code/comments/commits
- See `AGENTS.md` for all project reference (stack, architecture, commands, conventions, routes).

## Committing — MANDATORY

> **Never commit without explicit user instruction.** Regardless of what the task or summary says, wait for the user to say "commit" or "کامیت کن" before committing. No exceptions.
>
> Every commit must follow these rules. No exceptions.

1. **Format:** `type(scope): message` — imperative mood, English only.
   - Good: `feat(auth): add refresh token rotation`
   - Bad: `Added refresh token`, `fix bug`, `changes`
2. **One logical change per commit** — don't bundle unrelated fixes.
3. **Pre-commit hooks** — must pass. Fix failures (ESLint, prettier, ruff) before committing. Never `--no-verify`.
4. **Tests** — run `make test` before every commit. All must pass.
5. **Conventional commit types:**
   - `feat:` new feature
   - `fix:` bug fix
   - `refactor:` code change with no behavior change
   - `perf:` performance improvement
   - `chore:` tooling, deps, CI, linting
   - `docs:` documentation only
   - `style:` formatting, whitespace (not CSS)
   - `test:` adding/fixing tests

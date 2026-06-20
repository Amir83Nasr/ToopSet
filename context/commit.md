# Commit Conventions

**Format:** [Conventional Commits](https://www.conventionalcommits.org/)

```
<type>(<scope>): <description>
```

## Types

| Type       | Usage                                 |
| ---------- | ------------------------------------- |
| `feat`     | New feature                           |
| `fix`      | Bug fix                               |
| `refactor` | Code change with no feature/fix       |
| `chore`    | Maintenance, tooling, deps            |
| `docs`     | Documentation only                    |
| `style`    | Formatting, linting (no logic change) |
| `test`     | Adding/updating tests                 |
| `perf`     | Performance improvement               |

## Scopes

| Scope       | Area                                |
| ----------- | ----------------------------------- |
| `auth`      | Authentication, registration, login |
| `courts`    | Court listing, detail, CRUD         |
| `booking`   | Booking create, pay, cancel         |
| `map`       | Neshan map components, markers      |
| `dashboard` | Dashboard pages, sidebar            |
| `api`       | Backend endpoints, services         |
| `db`        | Database models, migrations         |
| `ui`        | shadcn components, styling          |
| `config`    | Makefile, env, Docker, CI           |

## Examples

```
feat(courts): multi-select sport filter + mono-color badges
fix(map): remove Neshan watermark from bottom-left
refactor(api): extract payment validation helper
chore(deps): upgrade FastAPI to 0.115
```

## Body & Footer

- Body: explain **what** and **why**, not how
- Footer: `BREAKING CHANGE:` or issue references
- Co-authored: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

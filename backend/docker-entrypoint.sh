#!/bin/bash
# ─── ToopSet — Docker Entrypoint ──────────────────────────────────────────────
# Runs as ENTRYPOINT inside the backend container.
# 1. Static revision check (no DB required)
# 2. Alembic upgrade head (requires DB — env var AUTO_MIGRATE=false to skip)
# If any step fails, exits immediately with a clear message.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Color helpers (fall back cleanly when not a terminal) ─────────────────────
if [ -t 1 ] && [ -n "$TERM" ]; then
  BOLD="\033[1m"
  RED="\033[31m"
  GREEN="\033[32m"
  YELLOW="\033[33m"
  CYAN="\033[36m"
  RESET="\033[0m"
else
  BOLD=""; RED=""; GREEN=""; YELLOW=""; CYAN=""; RESET=""
fi

# ── 1. Static migration revision check ────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}═══ Migration Revision Check ═══${RESET}"
python3 -m scripts.check_revisions
echo -e "${GREEN}  ✓ Revision check passed${RESET}"

# ── 2. Auto-migrate (unless disabled) ─────────────────────────────────────────
AUTO_MIGRATE="${AUTO_MIGRATE:-true}"
if [ "$AUTO_MIGRATE" = "true" ] || [ "$AUTO_MIGRATE" = "1" ]; then
  echo ""
  echo -e "${BOLD}${CYAN}═══ Applying pending migrations ═══${RESET}"
  alembic upgrade head
  echo -e "${GREEN}  ✓ Migrations applied${RESET}"
else
  echo ""
  echo -e "${YELLOW}  ⚠ AUTO_MIGRATE=false — skipping migration run${RESET}"
fi

# ── 3. Execute the main command (uvicorn, passed as CMD or args) ──────────────
echo ""
echo -e "${BOLD}${CYAN}═══ Starting application ═══${RESET}"
exec "$@"

#!/bin/bash
# ────────────────────────────────────────────────────────────
# ToopSet — Database Migration Runner
#
# Intended for use as a Kubernetes init-container or Docker
# entrypoint pre-flight step.  Runs pending Alembic migrations
# and exits with a non-zero status on failure.
#
# Usage:
#   ./scripts/run_migrations.sh
# ────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

cd "$APP_DIR"

echo "=== ToopSet: Running database migrations ==="

alembic upgrade head

echo "=== Migrations applied successfully ==="

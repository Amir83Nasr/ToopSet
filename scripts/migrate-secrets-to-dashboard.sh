#!/bin/bash
# ─── ToopSet — Migrate Secrets to Dashboard ──────────────────────────────────
# Your .env.production files contain real secrets on disk.
# This script helps you migrate them to Railway + Vercel dashboards.
#
# After running, DELETE the .env.production files:
#   rm backend/.env.production frontend/.env.production
#
# Then set these values in your dashboards (never on disk).
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPTS_DIR")"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ToopSet — Secret Migration Helper"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── Backend secrets ────────────────────────────────────────────
BACKEND_ENV="$ROOT_DIR/backend/.env.production"
if [ -f "$BACKEND_ENV" ]; then
    echo "┌── RAILWAY PRODUCTION ENVIRONMENT ──────────────────────────┐"
    echo "│ Set these in Railway dashboard: Project → Production env   │"
    echo "├──────────────────────────────────────────────────────────┤"
    # Extract key=value lines, skip comments and blanks
    grep -v '^#' "$BACKEND_ENV" | grep -v '^$' | while IFS='=' read -r key val; do
        # Only print keys with non-empty, non-comment values
        if [ -n "$key" ] && [ -n "$val" ]; then
            printf "  %-35s = %s\n" "$key" "${val:0:40}…"
        fi
    done
    echo "└──────────────────────────────────────────────────────────┘"
    echo ""
fi

# ── Frontend secrets ──────────────────────────────────────────
FRONTEND_ENV="$ROOT_DIR/frontend/.env.production"
if [ -f "$FRONTEND_ENV" ]; then
    echo "┌── VERCEL PRODUCTION ENVIRONMENT ───────────────────────────┐"
    echo "│ Set these in Vercel dashboard: Project → Settings → Env    │"
    echo "│ Scope: Production (not Preview, not Development)           │"
    echo "├──────────────────────────────────────────────────────────┤"
    grep -v '^#' "$FRONTEND_ENV" | grep -v '^$' | while IFS='=' read -r key val; do
        if [ -n "$key" ] && [ -n "$val" ]; then
            printf "  %-35s = %s\n" "$key" "${val:0:40}…"
        fi
    done
    echo "└──────────────────────────────────────────────────────────┘"
    echo ""
fi

echo "───────────────────────────────────────────────────────────────"
echo "  NEXT STEPS"
echo "───────────────────────────────────────────────────────────────"
echo ""
echo "  1. Copy these values into your dashboards (links below)"
echo "     Railway: https://railway.app/project/…/environment/production"
echo "     Vercel:  https://vercel.com/…/settings/environment-variables"
echo ""
echo "  2. DELETE the .env.production files after migrating:"
echo "     rm $ROOT_DIR/backend/.env.production"
echo "     rm $ROOT_DIR/frontend/.env.production"
echo ""
echo "  3. Set up Staging env vars on Railway (separate DB + Redis)"
echo "     Railway: https://railway.app/project/…/environment/staging"
echo ""
echo "───────────────────────────────────────────────────────────────"

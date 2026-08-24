# ─── ToopSet Makefile ─────────────────────────────────────────────────────────
# Developer command interface — thin wrappers around project tools.
# See README.md for the full guide.

SHELL := /bin/bash

# ── ANSI colors ───────────────────────────────────────────────────────────────
ESC    := $(shell printf '\033')
BOLD   := $(ESC)[1m
RESET  := $(ESC)[0m
GREEN  := $(ESC)[32m
CYAN   := $(ESC)[36m
YELLOW := $(ESC)[33m
RED    := $(ESC)[31m
GREY   := $(ESC)[90m

# ── Project config ────────────────────────────────────────────────────────────
COMPOSE_FILE    := compose.yml
COMPOSE_PROJECT := toopset
PROJECT_NAME    := ToopSet
BACKEND_DIR     := backend
FRONTEND_DIR    := frontend
UVICORN_PORT    ?= 8000
NEXT_PORT       ?= 3000
CUR_VERSION     := $(shell cat VERSION 2>/dev/null || echo "0.0.0")

.DEFAULT_GOAL := help

.PHONY: help \
        install install-backend install-frontend install-lefthook \
        dev-backend dev-frontend \
        build start \
        lint lint-backend lint-frontend \
        format format-backend format-frontend \
        typecheck typecheck-backend typecheck-frontend \
        test test-backend test-frontend test-db check \
        db-start db-stop db-status db-migrate db-check db-autogenerate \
        db-downgrade db-history db-current db-merge db-reset db-seed \
        up down logs ps \
        version version-check version-sync version-bump version-tag \
        clean clean-backend clean-frontend clean-db \
        doctor precommit prepush

# ─── Install ──────────────────────────────────────────────────────────────────
install: install-backend install-frontend install-lefthook ## Install all dependencies

install-backend: ## Install backend Python dependencies
	@cd $(BACKEND_DIR) && pip3 install -r requirements.txt
	@echo "  $(GREEN)✓$(RESET) Backend dependencies installed"

install-frontend: ## Install frontend dependencies (pnpm)
	@cd $(FRONTEND_DIR) && pnpm install
	@echo "  $(GREEN)✓$(RESET) Frontend dependencies installed"

install-lefthook: ## Register git hooks (lefthook)
	@cd $(FRONTEND_DIR) && pnpm exec lefthook install
	@echo "  $(GREEN)✓$(RESET) Lefthook hooks installed"

# ─── Development ──────────────────────────────────────────────────────────────
dev-backend: ## Start backend with auto-reload
	@cd $(BACKEND_DIR) && LOG_FORMAT=console uvicorn app.main:app --host 0.0.0.0 --port $(UVICORN_PORT) --reload

dev-frontend: ## Start frontend (Turbopack HMR)
	@cd $(FRONTEND_DIR) && pnpm dev

# ─── Build ────────────────────────────────────────────────────────────────────
build: ## Build frontend for production
	@cd $(FRONTEND_DIR) && pnpm build
	@echo "  $(GREEN)✓$(RESET) Frontend built"

start: ## Start production Next.js server
	@echo "  $(GREEN)►$(RESET) Starting frontend on http://localhost:$(NEXT_PORT)"
	@cd $(FRONTEND_DIR) && exec pnpm start

# ─── Quality ──────────────────────────────────────────────────────────────────
lint: lint-backend lint-frontend ## Lint all (never modifies source)

lint-backend: ## Lint backend (Ruff)
	@cd $(BACKEND_DIR) && ruff check .
	@echo "  $(GREEN)✓$(RESET) Backend linted"

lint-frontend: ## Lint frontend (ESLint)
	@cd $(FRONTEND_DIR) && pnpm lint
	@echo "  $(GREEN)✓$(RESET) Frontend linted"

format: format-backend format-frontend ## Format all code

format-backend: ## Format backend (Ruff)
	@cd $(BACKEND_DIR) && ruff format .
	@echo "  $(GREEN)✓$(RESET) Backend formatted"

format-frontend: ## Format frontend (Prettier)
	@cd $(FRONTEND_DIR) && pnpm format
	@echo "  $(GREEN)✓$(RESET) Frontend formatted"

typecheck: typecheck-backend typecheck-frontend ## Type-check all

typecheck-backend: ## Type-check backend (mypy)
	@cd $(BACKEND_DIR) && mypy app
	@echo "  $(GREEN)✓$(RESET) Backend type check passed"

typecheck-frontend: ## Type-check frontend (tsc)
	@cd $(FRONTEND_DIR) && pnpm typecheck
	@echo "  $(GREEN)✓$(RESET) Frontend type check passed"

# ─── Testing ──────────────────────────────────────────────────────────────────
test: test-backend test-frontend ## Run all tests

test-db: ## Create toopset_test DB (no-op)
	@PGPASSWORD=$${POSTGRES_PASSWORD:-toopset_secret} psql -h $${POSTGRES_HOST:-localhost} -p $${POSTGRES_PORT:-5432} -U $${POSTGRES_USER:-toopset} -d postgres -c "CREATE DATABASE toopset_test" 2>/dev/null || true
	@echo "  $(GREEN)✓$(RESET) Test database ready"

test-backend: test-db ## Run backend tests (pytest)
	@cd $(BACKEND_DIR) && python3 -m pytest tests/ -v --tb=short -W ignore::DeprecationWarning

test-frontend: ## Run frontend tests (Vitest)
	@cd $(FRONTEND_DIR) && pnpm test

check: lint typecheck build ## Lint + typecheck + build (CI gate)
	@echo "  $(GREEN)✓$(RESET) All checks passed"

# ─── Database ─────────────────────────────────────────────────────────────────
db-start: ## Start Postgres + Redis (Docker)
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d postgres redis
	@echo "  $(GREEN)✓$(RESET) Postgres and Redis started"

db-stop: ## Stop Postgres + Redis
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) stop postgres redis
	@echo "  $(GREEN)✓$(RESET) Postgres and Redis stopped"

db-status: ## Show DB container status
	@for svc in postgres redis; do \
		status=$$(docker inspect --format='{{.State.Status}}' $(COMPOSE_PROJECT)-$$svc 2>/dev/null || echo "not found"); \
		if [ "$$status" = "running" ]; then \
			echo "  $(GREEN)✓$(RESET) $$svc: $$status"; \
		else \
			echo "  $(RED)✗$(RESET) $$svc: $$status"; \
		fi; \
	done

db-migrate: ## Apply Alembic migrations
	@cd $(BACKEND_DIR) && python3 -m scripts.run_migrations upgrade
	@echo "  $(GREEN)✓$(RESET) Alembic migrations applied"

db-check: ## Static migration check (alembic check)
	@cd $(BACKEND_DIR) && python3 -m scripts.run_migrations check
	@echo "  $(GREEN)✓$(RESET) Migration check passed"

db-autogenerate: ## Create autogenerated migration
	@cd $(BACKEND_DIR) && python3 -m scripts.run_migrations autogenerate "$(MSG)"
	@echo "  $(GREEN)✓$(RESET) Autogenerated migration created"

db-downgrade: ## Roll back: make db-downgrade REV=-1
	@cd $(BACKEND_DIR) && python3 -m scripts.run_migrations downgrade "$(REV)"
	@echo "  $(GREEN)✓$(RESET) Rollback applied"

db-history: ## Show migration history
	@cd $(BACKEND_DIR) && python3 -m scripts.run_migrations history

db-current: ## Show current migration revision
	@cd $(BACKEND_DIR) && python3 -m scripts.run_migrations current

db-merge: ## Merge heads: make db-merge MSG="msg"
	@cd $(BACKEND_DIR) && python3 -m scripts.run_migrations merge "$(MSG)"
	@echo "  $(GREEN)✓$(RESET) Merge migration created"

db-reset: ## Wipe and recreate DB volumes
	@echo "  $(YELLOW)WARNING$(RESET) this deletes all database data!"; \
	read -p "  Continue? [y/N] " ans; \
	if [ "$$ans" = "y" ] || [ "$$ans" = "Y" ]; then \
		docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) down -v postgres redis && \
		docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d postgres redis && \
		echo "  $(GREEN)✓$(RESET) Databases recreated"; \
	else \
		echo "  $(GREY)Operation cancelled$(RESET)"; \
	fi

db-seed: ## Seed database with test data
	@cd $(BACKEND_DIR) && python3 scripts/generate-placeholder-court-images.py -q 2>/dev/null; python3 -m scripts.seed
	@echo "  $(GREEN)✓$(RESET) Database seeded"

# ─── Docker ───────────────────────────────────────────────────────────────────
up: ## Start all Docker services
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d --wait
	@echo "  $(GREEN)✓$(RESET) Core services started"
	@echo "  $(GREY)Frontend: http://localhost:$(NEXT_PORT)$(RESET)"
	@echo "  $(GREY)Backend:  http://localhost:$(UVICORN_PORT)$(RESET)"

down: ## Stop all Docker services
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) down
	@echo "  $(GREEN)✓$(RESET) Services stopped"

logs: ## Tail logs from all services
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) logs -f

ps: ## Show status of Docker services
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) ps

# ─── Version ──────────────────────────────────────────────────────────────────
version: ## Show current version
	@echo $(CUR_VERSION)

version-check: ## Version consistency across files
	@python3 scripts/check_version.py --all

version-sync: ## Sync VERSION into backend + frontend
	@python3 scripts/version.py sync
	@echo "  $(GREEN)✓$(RESET) Version synced to $(CUR_VERSION)"

version-bump: ## Bump version (patch|minor|major)
	@test -n "$(BUMP)" || { echo "  Usage: make version-bump BUMP=patch|minor|major"; exit 1; }
	@python3 scripts/version.py bump $(BUMP)
	@echo "  $(GREEN)✓$(RESET) Version bumped ($(BUMP))"

version-tag: ## Tag current version and push
	@git tag -a "v$(CUR_VERSION)" -m "Release v$(CUR_VERSION)" && git push origin "v$(CUR_VERSION)"
	@echo "  $(GREEN)✓$(RESET) Tagged v$(CUR_VERSION) and pushed"

# ─── Maintenance ──────────────────────────────────────────────────────────────
clean: clean-backend clean-frontend ## Remove build and cache artifacts

clean-backend: ## Remove backend caches
	@find $(BACKEND_DIR) -type d \( -name '__pycache__' -o -name '*.egg-info' \
		-o -name '.pytest_cache' -o -name '.ruff_cache' -o -name '.mypy_cache' \) \
		-prune -exec rm -rf {} +
	@find $(BACKEND_DIR) -type f -name '*.pyc' -delete
	@rm -f $(BACKEND_DIR)/.coverage
	@echo "  $(GREEN)✓$(RESET) Backend cache cleaned"

clean-frontend: ## Remove frontend build artifacts
	@rm -rf $(FRONTEND_DIR)/.next $(FRONTEND_DIR)/dist
	@echo "  $(GREEN)✓$(RESET) Frontend build artifacts cleaned"

clean-db: ## Delete all Docker volumes
	@echo "  $(YELLOW)WARNING$(RESET) this deletes all data!"; \
	read -p "  Type 'yes' to confirm: " ans; \
	if [ "$$ans" = "yes" ]; then \
		docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) down -v; \
		echo "  $(GREEN)✓$(RESET) All volumes deleted"; \
	else \
		echo "  $(GREY)Operation cancelled$(RESET)"; \
	fi

doctor: ## Check system prerequisites
	@printf "\n$(BOLD)System Check - $(PROJECT_NAME)$(RESET)\n"
	@printf -- "$(GREY)----------------------------$(RESET)\n"
	@for c in docker python3 node pnpm; do \
		command -v $$c >/dev/null 2>&1 && echo "  $(GREEN)✓$(RESET) $$c" || echo "  $(RED)✗$(RESET) $$c (missing)"; \
	done
	@command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 \
		&& echo "  $(GREEN)✓$(RESET) Docker daemon" || echo "  $(RED)✗$(RESET) Docker daemon not running"
	@for p in 5432 6379; do \
		lsof -i :$$p >/dev/null 2>&1 && echo "  $(GREEN)✓$(RESET) port $$p in use" \
			|| echo "  $(YELLOW)⚠$(RESET) port $$p free — run 'make db-start'"; \
	done
	@python3 -c "import fastapi" >/dev/null 2>&1 \
		&& echo "  $(GREEN)✓$(RESET) Python deps" || echo "  $(YELLOW)⚠$(RESET) Python deps missing — run 'make install-backend'"
	@[ -d $(FRONTEND_DIR)/node_modules ] \
		&& echo "  $(GREEN)✓$(RESET) Node deps" || echo "  $(YELLOW)⚠$(RESET) Node deps missing — run 'make install-frontend'"
	@printf -- "$(GREY)----------------------------$(RESET)\n\n"

# ─── Git Hooks ────────────────────────────────────────────────────────────────
precommit: ## Run lefthook pre-commit hook
	@cd $(FRONTEND_DIR) && pnpm exec lefthook run pre-commit
	@echo "  $(GREEN)✓$(RESET) Pre-commit checks passed"

prepush: ## Run lefthook pre-push hook
	@cd $(FRONTEND_DIR) && pnpm exec lefthook run pre-push
	@echo "  $(GREEN)✓$(RESET) Pre-push checks passed"

# ─── Help ─────────────────────────────────────────────────────────────────────
help: ## Show this help
	@printf "\n"
	@printf "\033[1;36m"
	@printf "%s\n" "$$(python3 scripts/ascii_logo.py $(PROJECT_NAME))"
	@printf "\033[0m\n"
	@printf "\n"
	@awk 'BEGIN {FS = ":.*##"; section = ""; last = ""; line = "──────────────────────────────────────────────────────────────────────"} \
	/^# ─── / { \
		s=$$0; gsub(/^# ──+ /,"",s); gsub(/ ──+.*$$/,"",s); section=s; \
	} \
	/^[a-zA-Z_-]+:.*##/ { \
		t=$$1; d=$$2; \
		if (section != last) { \
			if (last != "") printf "\033[2;37m└" line "┘\033[0m\n\n"; \
			printf "\033[2;37m┌──────────────────────────────────────────────────────────────────────┐\033[0m\n"; \
			printf "\033[2;37m│ \033[1;37m%-60s\033[0m \033[2;37m        │\033[0m\n", section; \
			printf "\033[2;37m├──────────────────────────────────────────────────────────────────────┤\033[0m\n"; \
			last = section; \
		} \
		printf "\033[2;37m│ \033[1;36m%-28s\033[0m \033[2;37m%-39s\033[0m \033[2;37m│\033[0m\n", t, d; \
	} END {printf "\033[2;37m└" line "┘\033[0m\n\n";}' Makefile
	@printf "\033[2;37m────────────────────────────────────────────────────────────────────────\033[0m\n"
	@printf "\033[2;37m→\033[0m \033[1;37mmake\033[0m \033[1;36m<command>\033[0m\n"
	@printf "\n"

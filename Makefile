# ─── ToopSet Makefile ─────────────────────────────────────────────────────────
SHELL := /bin/bash
.ONESHELL:

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
IMAGE_TAG       ?= $(shell cat VERSION 2>/dev/null || echo "latest")
BACKEND_DIR     := backend
FRONTEND_DIR    := frontend
UVICORN_PORT    ?= 8000
NEXT_PORT       ?= 3000

# ── Project variables ─────────────────────────────────────────────────────────
PROJECT_NAME       := ToopSet
PROJECT_NAME_ASCII := $(shell python3 scripts/ascii_logo.py $(PROJECT_NAME))
CUR_VERSION        := $(shell cat VERSION 2>/dev/null || echo "0.0.0")

.DEFAULT_GOAL := help

.PHONY: install install-backend install-frontend \
        dev dev-backend dev-frontend \
        build \
        lint lint-backend lint-frontend \
        format format-backend format-frontend \
        typecheck typecheck-backend typecheck-frontend \
        check check-be check-fe \
        test test-backend test-frontend test-db-setup test-db \
        db-start db-stop db-status db-migrate db-reset db-seed \
        up down logs ps up-build up-backend up-frontend compose-up-dev \
        back-build-docker front-build-docker docker-buildx \
        monitor monitor-stop \
        version version-sync version-bump version-tag version-check \
        clean clean-backend clean-frontend clean-db \
        prune doctor generate-logo \
        lefthook-install lefthook-uninstall lefthook-run precommit \
        help

# ─── Install ──────────────────────────────────────────────────────────────────
install: install-backend install-frontend install-lefthook ## Install all dependencies

install-backend: ## Install backend Python dependencies
	@cd $(BACKEND_DIR) && pip3 install -r requirements.txt
	@echo "  $(GREEN)✓$(RESET) Backend dependencies installed"

install-frontend: ## Install frontend dependencies (pnpm)
	@cd $(FRONTEND_DIR) && pnpm install
	@echo "  $(GREEN)✓$(RESET) Frontend dependencies installed"

install-lefthook: ## Install lefthook git hooks
	@cd $(FRONTEND_DIR) && npx lefthook install
	@echo "  $(GREEN)✓$(RESET) Lefthook hooks installed"

# ─── Development ──────────────────────────────────────────────────────────────
dev-backend: ## Start backend server with auto-reload
	@cd $(BACKEND_DIR) && uvicorn app.main:app --host 0.0.0.0 --port $(UVICORN_PORT) --reload

dev-frontend: ## Start frontend dev server with HMR (clears Turbopack cache — prevents OOM)
	@echo "  $(GREY)Clearing Turbopack cache (unbounded growth → OOM)...$(RESET)"
	@rm -rf $(FRONTEND_DIR)/.next/dev/cache
	@cd $(FRONTEND_DIR) && pnpm dev

# ─── Build ────────────────────────────────────────────────────────────────────
build: ## Build frontend for production
	@cd $(FRONTEND_DIR) && pnpm build
	@echo "  $(GREEN)✓$(RESET) Frontend built"

# ─── Lint ─────────────────────────────────────────────────────────────────────
lint: lint-backend lint-frontend ## Run all linters

lint-backend: ## Lint backend with Ruff
	@cd $(BACKEND_DIR) && ruff check --fix .
	@echo "  $(GREEN)✓$(RESET) Backend linted"

lint-frontend: ## Lint frontend with ESLint
	@cd $(FRONTEND_DIR) && pnpm lint
	@echo "  $(GREEN)✓$(RESET) Frontend linted"

# ─── Format ───────────────────────────────────────────────────────────────────
format: format-backend format-frontend ## Format all code

format-backend: ## Format backend with Ruff
	@cd $(BACKEND_DIR) && ruff format .
	@echo "  $(GREEN)✓$(RESET) Backend formatted"

format-frontend: ## Format frontend with Prettier
	@cd $(FRONTEND_DIR) && pnpm format
	@echo "  $(GREEN)✓$(RESET) Frontend formatted"

# ─── Typecheck ────────────────────────────────────────────────────────────────
typecheck: typecheck-backend typecheck-frontend ## Run all type checkers

typecheck-backend: ## Type-check backend with mypy
	@cd $(BACKEND_DIR) && mypy app
	@echo "  $(GREEN)✓$(RESET) Backend type check passed"

typecheck-frontend: ## Type-check frontend with TypeScript
	@cd $(FRONTEND_DIR) && pnpm typecheck
	@echo "  $(GREEN)✓$(RESET) Frontend type check passed"

# ─── Test ─────────────────────────────────────────────────────────────────────
test: test-backend test-frontend ## Run all tests

test-db: ## Create test database
	@PGPASSWORD=$${POSTGRES_PASSWORD:-toopset_secret} \
		psql -h $${POSTGRES_HOST:-localhost} -p $${POSTGRES_PORT:-5432} \
		-U $${POSTGRES_USER:-toopset} -d postgres \
		-c "CREATE DATABASE toopset_test" 2>/dev/null || true
	@echo "  $(GREEN)✓$(RESET) Test database ready"

test-backend: test-db ## Run backend tests with pytest
	@cd $(BACKEND_DIR) && pip install pytest pytest-asyncio httpx -q 2>/dev/null
	@cd $(BACKEND_DIR) && python3 -m pytest tests/ -v --tb=short -W ignore::DeprecationWarning

test-frontend: ## Run frontend tests with Vitest
	@cd $(FRONTEND_DIR) && pnpm test

# ─── Database ─────────────────────────────────────────────────────────────────
db-start: ## Start Postgres and Redis
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d postgres redis
	@echo "  $(GREEN)✓$(RESET) Postgres and Redis started"

db-stop: ## Stop Postgres and Redis
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) stop postgres redis
	@echo "  $(GREEN)✓$(RESET) Postgres and Redis stopped"

db-migrate: ## Run Alembic migrations
	@cd $(BACKEND_DIR) && alembic upgrade head
	@echo "  $(GREEN)✓$(RESET) Alembic migrations applied"

db-status: ## Check database container status
	@for svc in postgres redis; do \
		status=$$(docker inspect --format='{{.State.Status}}' $(COMPOSE_PROJECT)-$$svc 2>/dev/null || echo "not found"); \
		if [ "$$status" = "running" ]; then \
			echo "  $(GREEN)✓$(RESET) $$svc: $$status"; \
		else \
			echo "  $(RED)✗$(RESET) $$svc: $$status"; \
		fi; \
	done

db-reset: ## Wipe and recreate database volumes
	@echo "  $(YELLOW)WARNING$(RESET) This will delete all database data!"
	@read -p "  Continue? [y/N] " ans; \
	if [ "$$ans" = "y" ] || [ "$$ans" = "Y" ]; then \
		docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) down -v postgres redis && \
		docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d postgres redis && \
		echo "  $(GREEN)✓$(RESET) Databases recreated"; \
	else \
		echo "  $(GREY)Operation cancelled$(RESET)"; \
	fi

db-seed: ## Seed database with test data
	@cd $(BACKEND_DIR) && python3 -m scripts.seed
	@echo "  $(GREEN)✓$(RESET) Database seeded"

# ─── Docker: Full Stack ───────────────────────────────────────────────────────
up: ## Start core services
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d --wait \
		postgres redis backend frontend
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

up-build: ## Rebuild and start all services
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d --build --wait
	@echo "  $(GREEN)✓$(RESET) Services rebuilt and started"

up-backend: ## Rebuild and restart backend only
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d --build --wait backend
	@echo "  $(GREEN)✓$(RESET) Backend rebuilt"

up-frontend: ## Rebuild and restart frontend only
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d --build --wait frontend
	@echo "  $(GREEN)✓$(RESET) Frontend rebuilt"

# ─── Version Management ───────────────────────────────────────────────────────
version: ## Show current project version
	@echo "  $(CUR_VERSION)"

version-check: ## Verify versions across all files
	@python3 scripts/check_version.py --all

version-sync: ## Sync VERSIONS __init__ & package.json
	$(eval V := $(shell cat VERSION))
	@sed -i '' 's/^__version__ = ".*"/__version__ = "$(V)"/' $(BACKEND_DIR)/app/__init__.py
	@sed -i '' 's/"version": ".*"/"version": "$(V)"/' $(FRONTEND_DIR)/package.json
	@echo "  $(GREEN)✓$(RESET) Version synced to $(V)"

version-bump: ## Bump version (BUMP=patch|minor|major)
	@if [ -z "$(BUMP)" ]; then \
		echo "  $(RED)✗$(RESET) Usage: make version-bump BUMP=patch|minor|major"; \
		exit 1; \
	fi
	$(eval MAJ := $(word 1,$(subst ., ,$(CUR_VERSION))))
	$(eval MIN := $(word 2,$(subst ., ,$(CUR_VERSION))))
	$(eval PAT := $(word 3,$(subst ., ,$(CUR_VERSION))))
	$(eval NEW_V := $(if $(filter patch,$(BUMP)),$(MAJ).$(MIN).$$(shell expr $(PAT) + 1),$(if $(filter minor,$(BUMP)),$(MAJ).$$(shell expr $(MIN) + 1).0,$(if $(filter major,$(BUMP)),$$(shell expr $(MAJ) + 1).0.0,))))
	@if [ "$(NEW_V)" = "" ]; then \
		echo "  $(RED)✗$(RESET) Invalid BUMP: $(BUMP). Use patch, minor, or major."; \
		exit 1; \
	fi
	@printf '%s' "$(NEW_V)" > VERSION
	@$(MAKE) version-sync V=$(NEW_V)
	@echo "  $(GREEN)✓$(RESET) Bumped $(CUR_VERSION) -> $(NEW_V)"

version-tag: ## Create git tag CUR_VERSION and push
	@git tag -a "v$(CUR_VERSION)" -m "Release v$(CUR_VERSION)"
	@git push origin "v$(CUR_VERSION)"
	@echo "  $(GREEN)✓$(RESET) Tagged v$(CUR_VERSION) and pushed"

# ─── Clean ────────────────────────────────────────────────────────────────────
clean: clean-backend clean-frontend ## Remove all build artifacts

clean-backend: ## Remove backend cache and artifacts
	@find . -type d \( -name '__pycache__' -o -name '.idea' \
		-o -name '*_cache' -o -name '.egg-info' \) \
		-exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name '*.pyc' -o -name '.coverage' -o -name '.DS_Store' -delete
	@echo "  $(GREEN)✓$(RESET) Backend cache cleaned"

clean-frontend: ## Remove frontend build artifacts (fixes OOM — bloated Turbopack cache)
	@rm -rf $(FRONTEND_DIR)/.next $(FRONTEND_DIR)/dist
	@echo "  $(GREEN)✓$(RESET) Frontend build artifacts cleaned"

clean-db: ## Delete all Docker volumes (data loss)
	@echo "  $(YELLOW)WARNING$(RESET) This will delete all data!"
	@read -p "  Type 'yes' to confirm: " ans; \
	if [ "$$ans" = "yes" ]; then \
		docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) down -v; \
		echo "  $(GREEN)✓$(RESET) All volumes deleted"; \
	else \
		echo "  $(GREY)Operation cancelled$(RESET)"; \
	fi

# ─── Maintenance ──────────────────────────────────────────────────────────────
doctor: ## Check system requirements
	@echo ""
	@printf "$(BOLD)System Check - ToopSet$(RESET)\n"
	@printf -- "$(GREY)--------------------------$(RESET)\n"
	@for cmd in docker python3 node; do \
		if command -v $$cmd &>/dev/null; then \
			printf "  $(GREEN)✓$(RESET) $$cmd found\n"; \
		else \
			printf "  $(RED)✗$(RESET) $$cmd not found\n"; \
		fi; \
	done
	@if command -v docker &>/dev/null && docker info >/dev/null 2>&1; then \
		printf "  $(GREEN)✓$(RESET) Docker daemon running\n"; \
	else \
		printf "  $(RED)✗$(RESET) Docker daemon not running\n"; \
	fi
	@for port in 5432 6379; do \
		if lsof -i :$$port &>/dev/null; then \
			printf "  $(GREEN)✓$(RESET) Port $$port in use\n"; \
		else \
			printf "  $(YELLOW)WARN$(RESET) Port $$port free - run 'make db-start'\n"; \
		fi; \
	done
	@if python3 -c "import fastapi" 2>/dev/null; then \
		printf "  $(GREEN)✓$(RESET) Python deps installed\n"; \
	else \
		printf "  $(YELLOW)WARN$(RESET) Python deps missing - run 'make install-backend'\n"; \
	fi
	@if [ -d "$(FRONTEND_DIR)/node_modules" ]; then \
		printf "  $(GREEN)✓$(RESET) Node deps installed\n"; \
	else \
		printf "  $(YELLOW)WARN$(RESET) Node deps missing - run 'make install-frontend'\n"; \
	fi
	@printf -- "$(GREY)--------------------------$(RESET)\n\n"

# ─── Lefthook ─────────────────────────────────────────────────────────────────

prepush: ## Run lefthook hook (HOOK=pre-push)
	@cd $(FRONTEND_DIR) && npx lefthook run pre-push
	@echo "  $(GREEN)✓$(RESET) Pre-push checks passed"

precommit: ## Run lefthook hook (HOOK=pre-commit)
	@cd $(FRONTEND_DIR) && npx lefthook run pre-commit
	@echo "  $(GREEN)✓$(RESET) Pre-commit checks passed"

# ─── Check: aggregate validation ──────────────────────────────────────────────
check: lint typecheck build ## Run all (lint + typecheck + build)
	@echo "  $(GREEN)✓$(RESET) All checks passed"

check-frontend: lint-frontend typecheck-frontend build ## Run all frontend checks

check-backend: lint-backend typecheck-backend ## Run all backend checks

# ─── Help ─────────────────────────────────────────────────────────────────────
help: ## Show this help message
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

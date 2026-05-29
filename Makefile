# ─── ToopSet Makefile ────────────────────────────────────────────
# A self-documenting Makefile. Targets automatically appear in
# `make help` when they have a `##` comment after their declaration.
# ─────────────────────────────────────────────────────────────────

SHELL := /bin/bash
.ONESHELL:

# ── ANSI colors ────────────────────────────────────────────
ESC    := $(shell printf '\033')
BOLD   := $(ESC)[1m
RESET  := $(ESC)[0m
GREEN  := $(ESC)[32m
CYAN   := $(ESC)[36m
YELLOW := $(ESC)[33m
RED    := $(ESC)[31m
GREY   := $(ESC)[90m

# ── Project config ─────────────────────────────────────────
COMPOSE_FILE    := compose.yml
COMPOSE_PROJECT := toopset
IMAGE_NAME      := toopset
IMAGE_TAG       ?= $(shell cat VERSION 2>/dev/null || echo "latest")
BACKEND_DIR     := backend
FRONTEND_DIR    := frontend
UVICORN_PORT    ?= 8000
NEXT_PORT       ?= 3000

# ── Version management ─────────────────────────────────────────
CUR_VERSION := $(shell cat VERSION 2>/dev/null || echo "0.0.0")
SEMVER_RE   := ^[0-9]+\.[0-9]+\.[0-9]+

# ─────────────────────────────────────────────────────────────────────
# 🏠  Help
# ─────────────────────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help screen
	@printf "\n$(BOLD)Usage:$(RESET)  make $(GREEN)<target>$(RESET)\n\n"
	@awk -F ':.*## ' \
		-v green="$(GREEN)" \
		-v cyan="$(CYAN)" \
		-v bold="$(BOLD)" \
		-v grey="$(GREY)" \
		-v reset="$(RESET)" \
		' \
		/^# ---+ / { \
			title = $$0; \
			gsub(/^# -+ | -+$$/, "", title); \
			sec[++s] = title; \
			items[s] = ""; \
			next \
		} \
		/^[a-zA-Z_-]+:.*## / { \
			gsub(/:.*## /, "|", $$0); \
			split($$0, a, "|"); \
			t = a[1]; d = a[2]; \
			items[s] = items[s] sprintf("  %s%-22s%s %s\n", green, t, reset, d) \
		} \
		END { \
			for (i = 1; i <= s; i++) { \
				printf "\n%s%s── %s ──%s\n\n", bold, cyan, sec[i], reset; \
				printf "%s", items[i] \
			}; \
			printf "\n" \
		}' Makefile

# ─────────────────────────────────────────────────────────────────────
# --- Frontend (local) ---
# ─────────────────────────────────────────────────────────────────────

.PHONY: front-dev front-build front-start front-lint front-format front-typecheck front-install front-clean

front-dev: ## Start frontend dev server (Turbopack, HMR)
	@cd $(FRONTEND_DIR) && npm run dev

front-build: ## Build frontend for production
	@cd $(FRONTEND_DIR) && npm run build

front-start: ## Start frontend production server
	@cd $(FRONTEND_DIR) && npm run start

front-lint: ## Lint frontend code (ESLint)
	@cd $(FRONTEND_DIR) && npm run lint

front-format: ## Format frontend code (Prettier)
	@cd $(FRONTEND_DIR) && npm run format

front-typecheck: ## Run TypeScript type checking (tsc --noEmit)
	@cd $(FRONTEND_DIR) && npm run typecheck

front-install: ## Install / update frontend npm dependencies
	@cd $(FRONTEND_DIR) && npm install

front-clean: ## Remove .next build cache and node_modules
	@rm -rf $(FRONTEND_DIR)/.next $(FRONTEND_DIR)/node_modules
	@echo "  $(GREEN)✓$(RESET) Frontend cache cleaned"

# ─────────────────────────────────────────────────────────────────────
# --- Backend (local) ---
# ─────────────────────────────────────────────────────────────────────

.PHONY: back-dev back-deps back-migrate back-shell back-clean back-lint back-format back-typecheck back-check

back-dev: ## Start backend dev server (uvicorn, auto-reload on save)
	@cd $(BACKEND_DIR) && uvicorn app.main:app --host 0.0.0.0 --port $(UVICORN_PORT) --reload

back-deps: ## Install / sync backend Python dependencies (pip install -r)
	@pip3 install -r $(BACKEND_DIR)/requirements.txt
	@echo "  $(GREEN)✓$(RESET) Backend deps installed"

back-migrate: ## Run Alembic migrations (upgrade head)
	@cd $(BACKEND_DIR) && alembic upgrade head
	@echo "  $(GREEN)✓$(RESET) Migrations up to date"

back-shell: ## Open a Python shell inside the backend directory
	@cd $(BACKEND_DIR) && python3 -c "import code; code.interact(local={'app': 'toopset'})"

back-lint: ## Lint Python code with ruff
	@cd $(BACKEND_DIR) && ruff check .
	@echo "  $(GREEN)✓$(RESET) Ruff checks passed"

back-format: ## Format Python code with ruff
	@cd $(BACKEND_DIR) && ruff check --fix .
	@ruff format $(BACKEND_DIR)
	@echo "  $(GREEN)✓$(RESET) Ruff format applied"

back-format-check: ## Check formatting without changing files
	@cd $(BACKEND_DIR) && ruff format --check .
	@echo "  $(GREEN)✓$(RESET) Formatting looks good"

back-typecheck: ## Type-check Python code with mypy
	@cd $(BACKEND_DIR) && mypy app
	@echo "  $(GREEN)✓$(RESET) mypy passed"

back-check: ## Run all Python checks (lint + format-check + typecheck)
	@$(MAKE) back-lint && \
	 $(MAKE) back-format-check && \
	 $(MAKE) back-typecheck && \
	 echo "  $(GREEN)✓$(RESET) All checks passed"

back-clean: ## Remove Python cache files (__pycache__, .pyc)
	@find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null; \
	 find . -name '*.pyc' -delete
	@echo "  $(GREEN)✓$(RESET) Python cache cleaned"

# ─────────────────────────────────────────────────────────────────────
# --- Local dev (frontend + backend together) ---
# ─────────────────────────────────────────────────────────────────────

.PHONY: dev install

dev: ## 🚀 Start both backend + frontend in split Terminal tabs (macOS)
	@echo "  $(CYAN)ℹ$(RESET)  Opening backend + frontend in separate Terminal tabs…"
	@osascript -e '
		tell application "Terminal"
			activate
			-- backend tab
			tell application "System Events" to keystroke "t" using command down
			delay 0.3
			do script "cd $(PWD) && make back-dev" in front tab of front window
			-- frontend tab
			tell application "System Events" to keystroke "t" using command down
			delay 0.3
			do script "cd $(PWD) && make front-dev" in front tab of front window
		end tell
	'
	@echo "  $(GREEN)✓$(RESET) Both servers started — switch to Terminal to see logs"

dev-manual: ## Start backend (background) + frontend (foreground) in one terminal
	@echo "  $(CYAN)ℹ$(RESET)  Starting backend in background…"
	@cd $(BACKEND_DIR) && uvicorn app.main:app --host 0.0.0.0 --port $(UVICORN_PORT) --reload &
	@sleep 2
	@echo "  $(CYAN)ℹ$(RESET)  Starting frontend…"
	@cd $(FRONTEND_DIR) && npm run dev

install: ## Install ALL project dependencies (npm + pip)
	@$(MAKE) back-deps
	@$(MAKE) front-install
	@echo "  $(GREEN)✓$(RESET) All dependencies installed"

# ─────────────────────────────────────────────────────────────────────
# --- Version management ---
# ─────────────────────────────────────────────────────────────────────

.PHONY: version version-sync version-bump version-check

version: ## Show current project version
	@echo "  $(CUR_VERSION)"

version-sync: ## Sync VERSION → pyproject.toml + package.json
	$(eval V := $(shell cat VERSION))
	@sed -i '' 's/^version = ".*"/version = "$(V)"/' $(BACKEND_DIR)/pyproject.toml
	@sed -i '' 's/"version": ".*"/"version": "$(V)"/' $(FRONTEND_DIR)/package.json
	@echo "  $(GREEN)✓$(RESET) Version synced to $(V)"

define bump-usage
Usage:  make version-bump BUMP=<part>
  BUMP=patch   (0.1.0 → 0.1.1)
  BUMP=minor   (0.1.0 → 0.2.0)
  BUMP=major   (0.1.0 → 1.0.0)
endef

version-bump: ## Bump version (BUMP=patch|minor|major)
	@if [ -z "$(BUMP)" ]; then \
		echo "  $(RED)✗$(RESET) Usage: make version-bump BUMP=patch|minor|major"; \
		exit 1; \
	fi
	$(eval V := $(shell cat VERSION))
	$(eval MAJ := $(word 1,$(subst ., ,$(V))))
	$(eval MIN := $(word 2,$(subst ., ,$(V))))
	$(eval PAT := $(word 3,$(subst ., ,$(V))))
	$(eval NEW_V := $(if $(filter patch,$(BUMP)),$(MAJ).$(MIN).$$(shell expr $(PAT) + 1),$(if $(filter minor,$(BUMP)),$(MAJ).$$(shell expr $(MIN) + 1).0,$(if $(filter major,$(BUMP)),$$(shell expr $(MAJ) + 1).0.0,))))
	@if [ "$(NEW_V)" = "" ]; then \
		echo "  $(RED)✗$(RESET) Invalid BUMP: $(BUMP). Use patch, minor, or major."; \
		exit 1; \
	fi
	@printf '%s' "$(NEW_V)" > VERSION
	@$(MAKE) version-sync V=$(NEW_V)
	@echo "  $(GREEN)✓$(RESET) Bumped $(V) → $(NEW_V)"

version-check: ## Verify VERSION matches pyproject.toml and package.json
	@python3 scripts/check-version.py "$(shell cat VERSION)" \
		--pyproject $(BACKEND_DIR)/pyproject.toml \
		--package $(FRONTEND_DIR)/package.json

# ─────────────────────────────────────────────────────────────────────
# --- Docker: databases only ---
# ─────────────────────────────────────────────────────────────────────

.PHONY: db db-stop db-status db-reset

db: ## Start only Postgres + Redis (fast, for local dev servers)
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d postgres redis
	@echo "  $(GREEN)✓$(RESET) Postgres + Redis are up"

db-stop: ## Stop Postgres + Redis (data persists in volumes)
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) stop postgres redis
	@echo "  $(GREEN)✓$(RESET) Postgres + Redis stopped"

db-status: ## Check if Postgres and Redis are healthy
	@docker inspect --format='{{.State.Status}}' toopset-postgres 2>/dev/null || echo "  $(RED)✗$(RESET) Postgres not running"
	@docker inspect --format='{{.State.Status}}' toopset-redis 2>/dev/null || echo "  $(RED)✗$(RESET) Redis not running"

db-reset: ## ⚠️  Wipe all database data (destroys volumes!)
	@echo "  $(YELLOW)⚠$(RESET)  This will DELETE all data!"
	@read -p "  Continue? [y/N] " ans; \
	if [ "$$ans" = "y" ] || [ "$$ans" = "Y" ]; then \
		docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) down -v postgres redis; \
		docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d postgres redis; \
		echo "  $(GREEN)✓$(RESET) Databases recreated"; \
	else \
		echo "  $(GREY)Aborted$(RESET)"; \
	fi

# ─────────────────────────────────────────────────────────────────────
# --- Docker: full stack ---
# ─────────────────────────────────────────────────────────────────────

.PHONY: up down logs ps

up: ## Start ALL Docker services (full stack: frontend + backend + db + monitoring)
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d
	@echo "  $(GREEN)✓$(RESET) All services started"
	@echo "  $(GREY)│$(RESET)  Frontend:  http://localhost:$(NEXT_PORT)"
	@echo "  $(GREY)│$(RESET)  Backend:   http://localhost:$(UVICORN_PORT)"
	@echo "  $(GREY)│$(RESET)  Kibana:    http://localhost:5601"
	@echo "  $(GREY)│$(RESET)  Grafana:   http://localhost:3001"
	@echo "  $(GREY)│$(RESET)  Prometheus:  http://localhost:9090"
	@echo "  $(GREY)│$(RESET)  Alertmanager: http://localhost:9093"

down: ## Stop all Docker services (data stays in volumes)
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) down
	@echo "  $(GREEN)✓$(RESET) Services stopped"

logs: ## Tail logs from all Docker services (Ctrl+C to exit)
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) logs -f

ps: ## Show status of all Docker services
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) ps

# ─────────────────────────────────────────────────────────────────────
# --- Docker: compose rebuild ---
# ─────────────────────────────────────────────────────────────────────

.PHONY: up-build up-backend up-frontend

up-build: ## Rebuild all images and start services
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d --build
	@echo "  $(GREEN)✓$(RESET) Services rebuilt and started"

up-backend: ## Rebuild only backend image and restart it
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d --build backend
	@echo "  $(GREEN)✓$(RESET) Backend rebuilt"

up-frontend: ## Rebuild only frontend image and restart it
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d --build frontend
	@echo "  $(GREEN)✓$(RESET) Frontend rebuilt"

# ─────────────────────────────────────────────────────────────────────
# --- Single Docker image (monolith) ---
# ─────────────────────────────────────────────────────────────────────

.PHONY: build run run-stop

build: ## 🐳 Build the single toopset image (frontend + backend in one)
	@echo "  $(CYAN)ℹ$(RESET)  Building $(IMAGE_NAME):$(IMAGE_TAG)…"
	@docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .
	@echo "  $(GREEN)✓$(RESET)  Built $(IMAGE_NAME):$(IMAGE_TAG)"

run: ## 🐳 Run the single toopset image (requires Postgres/Redis running)
	@echo "  $(CYAN)ℹ$(RESET)  Starting toopset container…"
	@docker rm -f toopset 2>/dev/null; true
	@docker run -d \
		--name toopset \
		-p $(NEXT_PORT):3000 \
		-p $(UVICORN_PORT):8000 \
		--env-file .env \
		--add-host host.docker.internal:host-gateway \
		$(IMAGE_NAME):$(IMAGE_TAG)
	@echo "  $(GREEN)✓$(RESET)  toopset container started"
	@echo "  $(GREY)│$(RESET)  Frontend: http://localhost:$(NEXT_PORT)"
	@echo "  $(GREY)│$(RESET)  Backend:  http://localhost:$(UVICORN_PORT)"

run-stop: ## Stop the single toopset container
	@docker rm -f toopset 2>/dev/null; true
	@echo "  $(GREEN)✓$(RESET)  toopset container removed"

# ─────────────────────────────────────────────────────────────────────
# --- Monitoring (standalone) ---
# ─────────────────────────────────────────────────────────────────────

.PHONY: monitor monitor-stop

monitor: ## Start only monitoring stack (ELK + Prometheus + Grafana + Alertmanager)
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d \
		elasticsearch logstash kibana prometheus grafana alertmanager \
		postgres_exporter redis_exporter
	@echo "  $(GREEN)✓$(RESET)  Monitoring stack started"
	@echo "  $(GREY)│$(RESET)  Kibana:    http://localhost:5601"
	@echo "  $(GREY)│$(RESET)  Grafana:   http://localhost:3001"
	@echo "  $(GREY)│$(RESET)  Prometheus:  http://localhost:9090"
	@echo "  $(GREY)│$(RESET)  Alertmanager: http://localhost:9093"

monitor-stop: ## Stop monitoring stack
	@docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) stop \
		elasticsearch logstash kibana prometheus grafana alertmanager \
		postgres_exporter redis_exporter
	@echo "  $(GREEN)✓$(RESET)  Monitoring stopped"

# ─────────────────────────────────────────────────────────────────────
# --- Testing ---
# ─────────────────────────────────────────────────────────────────────

.PHONY: test back-test front-test test-db-setup

## Run all tests
test: back-test front-test

## Create the test PostgreSQL database (requires running Postgres)
test-db-setup: ## Create toopset_test database for integration tests
	@PGPASSWORD=$${POSTGRES_PASSWORD:-toopset_secret} \
		psql -h $${POSTGRES_HOST:-localhost} -p $${POSTGRES_PORT:-5432} \
		-U $${POSTGRES_USER:-toopset} -d postgres \
		-c "CREATE DATABASE toopset_test" 2>/dev/null || \
		echo "  $(YELLOW)ℹ$(RESET) Database 'toopset_test' may already exist"
	@echo "  $(GREEN)✓$(RESET) Test database ready"

## Run backend tests (starts Postgres if not running)
back-test: test-db-setup ## Run Python tests with pytest
	@cd backend && pip install pytest pytest-asyncio httpx pytest-httpx asgi-lifespan -q 2>/dev/null; python3 -m pytest tests/ -v --tb=short -W ignore::DeprecationWarning

## Run frontend tests
front-test: ## Run Vitest tests
	cd frontend && npx vitest run

# ─────────────────────────────────────────────────────────────────────
# --- Lint / Format / Typecheck (full project) ---
# ─────────────────────────────────────────────────────────────────────

.PHONY: lint format typecheck check

lint: ## Run all linters (ruff + ESLint)
	@$(MAKE) back-lint
	@$(MAKE) front-lint

format: ## Format all code (ruff format + Prettier)
	@$(MAKE) back-format
	@$(MAKE) front-format

typecheck: ## Run all type checkers (mypy + TypeScript)
	@$(MAKE) back-typecheck
	@$(MAKE) front-typecheck

check: ## Run ALL checks (lint + format-check + typecheck)
	@echo "  $(CYAN)ℹ$(RESET)  Running all checks…"
	@$(MAKE) lint
	@$(MAKE) back-format-check
	@$(MAKE) typecheck
	@echo ""
	@echo "  $(GREEN)✓$(RESET) All checks passed"

# ─────────────────────────────────────────────────────────────────────
# --- Maintenance ---
# ─────────────────────────────────────────────────────────────────────

.PHONY: clean prune doctor

clean: ## ⚠️  Remove ALL containers + volumes (irreversible data loss)
	@echo "  $(YELLOW)⚠$(RESET)  This will DELETE all Docker volumes (Postgres, Redis, ES, Grafana)!"
	@read -p "  Type 'yes' to confirm: " ans; \
	if [ "$$ans" = "yes" ]; then \
		docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) down -v; \
		-docker rm -f toopset 2>/dev/null; \
		-docker rmi $(IMAGE_NAME):$(IMAGE_TAG) 2>/dev/null; \
		echo "  $(GREEN)✓$(RESET)  All cleaned"; \
	else \
		echo "  $(GREY)Aborted$(RESET)"; \
	fi

prune: ## 🧹 Docker system prune (remove unused images, containers, cache)
	@docker system prune -af --volumes
	@echo "  $(GREEN)✓$(RESET)  Docker pruned"

doctor: ## 🔍 Check system health (Docker, ports, Python, Node)
	@echo ""
	@printf "$(BOLD)System check for ToopSet$(RESET)\n"
	@printf -- "$(GREY)──────────────────────────────────$(RESET)\n"
	@# Docker
	@if command -v docker &>/dev/null; then \
		printf "  $(GREEN)✓$(RESET) Docker found\n"; \
	else \
		printf "  $(RED)✗$(RESET) Docker not found\n"; \
	fi
	@# Python
	@if command -v python3 &>/dev/null; then \
		pyver=$$(python3 --version 2>&1); \
		printf "  $(GREEN)✓$(RESET) $$pyver\n"; \
	else \
		printf "  $(RED)✗$(RESET) Python 3 not found\n"; \
	fi
	@# Node
	@if command -v node &>/dev/null; then \
		never=$$(node --version 2>&1); \
		npmver=$$(npm --version 2>&1); \
		printf "  $(GREEN)✓$(RESET) Node $$never / npm $$npmver\n"; \
	else \
		printf "  $(RED)✗$(RESET) Node.js not found\n"; \
	fi
	@# PostgreSQL port
	@if lsof -i :5432 &>/dev/null; then \
		printf "  $(GREEN)✓$(RESET) Port 5432 (Postgres) in use\n"; \
	else \
		printf "  $(YELLOW)⚠$(RESET) Port 5432 free — run $(GREY)make db$(RESET)\n"; \
	fi
	@# Redis port
	@if lsof -i :6379 &>/dev/null; then \
		printf "  $(GREEN)✓$(RESET) Port 6379 (Redis) in use\n"; \
	else \
		printf "  $(YELLOW)⚠$(RESET) Port 6379 free — run $(GREY)make db$(RESET)\n"; \
	fi
	@# Python deps
	@if python3 -c "import fastapi" &>/dev/null; then \
		printf "  $(GREEN)✓$(RESET) Python deps installed\n"; \
	else \
		printf "  $(YELLOW)⚠$(RESET) Python deps missing — run $(GREY)make back-deps$(RESET)\n"; \
	fi
	@# Node deps
	@if [ -d "$(FRONTEND_DIR)/node_modules" ]; then \
		printf "  $(GREEN)✓$(RESET) Node deps installed\n"; \
	else \
		printf "  $(YELLOW)⚠$(RESET) Node deps missing — run $(GREY)make front-install$(RESET)\n"; \
	fi
	@printf -- "$(GREY)──────────────────────────────────$(RESET)\n"
	@echo ""

.DEFAULT_GOAL := help

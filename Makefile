# ─── ToopSet Makefile ──────────────────────────────────────
# Targets:
#   make help       — show this help
#
#   ── Dev servers (local, no Docker) ──
#   make front-dev      — start frontend (Turbopack)
#   make front-lint     — lint frontend
#   make front-format   — format frontend with Prettier
#   make front-typecheck— TypeScript type checking
#   make back-dev       — start backend (uvicorn reload)
#   make back-deps      — install backend Python deps
#   make dev            — start both frontend + backend
#
#   ── Docker (full stack with compose) ──
#   make db             — start only Postgres + Redis
#   make db-stop        — stop Postgres + Redis
#   make up             — start all services
#   make down           — stop all services
#   make logs           — tail all service logs
#
#   ── Single Docker image ──
#   make build          — build toopset image (Dockerfile)
#   make run            — run toopset image (needs DB)
#
#   ── Maintenance ──
#   make install        — install all deps
#   make clean          — remove containers + volumes
# ───────────────────────────────────────────────────────────

SHELL := /bin/bash
COMPOSE_FILE   = compose.yml
COMPOSE_PROJECT = toopset
IMAGE_NAME     = toopset
IMAGE_TAG      ?= latest

# ── Help ───────────────────────────────────────────────────
.PHONY: help
help:
	@echo "Usage: make <target>"
	@echo ""
	@grep -E '^#   make ' Makefile | sed 's/^#   //'

# ======================================================================
# ── Frontend (local) ──────────────────────────────────────────────────
# ======================================================================

.PHONY: front-dev front-lint front-format front-typecheck

front-dev: ## Start frontend dev server (Turbopack)
	cd frontend && npm run dev

front-lint: ## Lint frontend code
	cd frontend && npm run lint

front-format: ## Format frontend code with Prettier
	cd frontend && npm run format

front-typecheck: ## Run TypeScript type checking
	cd frontend && npm run typecheck

# ======================================================================
# ── Backend (local) ───────────────────────────────────────────────────
# ======================================================================

.PHONY: back-dev back-deps

back-dev: ## Start backend dev server (local, auto-reload)
	cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

back-deps: ## Install backend dependencies
	pip install -r backend/requirements.txt

# ======================================================================
# ── Both frontend + backend (local) ───────────────────────────────────
# ======================================================================

.PHONY: dev

dev: ## Start both frontend and backend dev servers
	@echo "Starting backend & frontend in parallel…"
	$(MAKE) back-dev & $(MAKE) front-dev; wait

.PHONY: install

install: ## Install all dependencies
	$(MAKE) back-deps
	cd frontend && npm install

# ======================================================================
# ── Databases only (fast local dev) ───────────────────────────────────
# ======================================================================

.PHONY: db db-stop

db: ## Start only Postgres + Redis (for local dev servers)
	docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d postgres redis

db-stop: ## Stop Postgres + Redis
	docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) stop postgres redis

# ======================================================================
# ── Full Docker stack ─────────────────────────────────────────────────
# ======================================================================

.PHONY: up down logs

up: ## Start all Docker services (full stack)
	docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) up -d

down: ## Stop all Docker services
	docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) down

logs: ## Tail logs from all Docker services
	docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) logs -f

# ======================================================================
# ── Single image (monolith) ──────────────────────────────────────────
# ======================================================================

.PHONY: build run

build: ## Build single toopset image (frontend + backend in one)
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .

run: ## Run single toopset image (requires Postgres/Redis running)
	docker run -d \
		--name toopset \
		-p 3000:3000 -p 8000:8000 \
		--env-file .env \
		--add-host host.docker.internal:host-gateway \
		$(IMAGE_NAME):$(IMAGE_TAG)

# ======================================================================
# ── Cleanup ───────────────────────────────────────────────────────────
# ======================================================================

.PHONY: clean

clean: ## Remove all containers + volumes (⚠ data loss)
	docker compose -f $(COMPOSE_FILE) -p $(COMPOSE_PROJECT) down -v
	-docker rm -f toopset 2>/dev/null

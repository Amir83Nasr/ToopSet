.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# ── Frontend ──────────────────────────────────────────────

.PHONY: front-dev
front-dev: ## Start frontend dev server (Turbopack)
	cd frontend && npm run dev

.PHONY: front-build
front-build: ## Build frontend for production
	cd frontend && npm run build

.PHONY: front-start
front-start: ## Start frontend production server
	cd frontend && npm run start

.PHONY: front-lint
front-lint: ## Lint frontend code
	cd frontend && npm run lint

.PHONY: front-format
front-format: ## Format frontend code with Prettier
	cd frontend && npm run format

.PHONY: front-typecheck
front-typecheck: ## Run TypeScript type checking
	cd frontend && npm run typecheck

.PHONY: front-install
front-install: ## Install frontend dependencies
	cd frontend && npm install

.PHONY: front-clean
front-clean: ## Clean frontend build artifacts
	rm -rf frontend/.next frontend/node_modules

# ── Backend ───────────────────────────────────────────────

.PHONY: back-dev
back-dev: ## Start backend dev server (local, no Docker)
	cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

.PHONY: back-deps
back-deps: ## Install backend dependencies
	cd backend && pip install -r requirements.txt

.PHONY: back-clean
back-clean: ## Clean backend build artifacts
	rm -rf backend/__pycache__ backend/app/__pycache__ backend/**/__pycache__

# ── All ───────────────────────────────────────────────────

.PHONY: dev
dev: ## Start both frontend and backend dev servers
	$(MAKE) back-dev & $(MAKE) front-dev

.PHONY: lint
lint: front-lint back-lint ## Run all linters

.PHONY: clean
clean: front-clean back-clean ## Clean all build artifacts

.PHONY: install
install: front-install back-deps ## Install all dependencies

# ── Docker ────────────────────────────────────────────────

.PHONY: docker-up
docker-up: ## Start all Docker services (Postgres, Redis, Backend)
	docker compose up -d

.PHONY: docker-down
docker-down: ## Stop all Docker services
	docker compose down

.PHONY: docker-logs
docker-logs: ## Tail logs from all Docker services
	docker compose logs -f

.PHONY: docker-build
docker-build: ## Rebuild backend Docker image
	docker compose build backend

.PHONY: docker-reset
docker-reset: ## Stop and remove all containers + volumes (destroys data)
	docker compose down -v

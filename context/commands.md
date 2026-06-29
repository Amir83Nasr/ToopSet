# Commands (Makefile)

## Development

```bash
make db-start        # Start Postgres + Redis via Docker
make dev-backend     # uvicorn --reload :8000
make dev-frontend    # next dev --turbopack :3000
make build           # Build frontend for production
```

## Docker Full Stack

```bash
make up              # Start all 4 services (postgres, redis, backend, frontend)
make down            # Stop all
make up-build        # Rebuild and restart all
make up-backend      # Rebuild backend only
make up-frontend     # Rebuild frontend only
make logs            # Tail logs from all services
make ps              # Show status
```

## Database

```bash
make db-status       # Check container status
make db-migrate      # Run Alembic migrations
make db-reset        # Wipe volumes and recreate
make db-seed         # Seed with Persian test data
make db-stop         # Stop containers
```

## Code Quality

```bash
make lint            # ruff (backend) + eslint (frontend)
make format          # ruff format + prettier
make typecheck       # mypy + tsc
make check           # ALL lint + format + typecheck (run before push)
```

## Testing

```bash
make test            # pytest + vitest
make test-backend    # pytest only
make test-frontend   # vitest run only
```

## Version

```bash
make version                      # Show current version
make version-check                # Verify consistency
make version-sync                 # VERSION → __init__.py + package.json
make version-bump BUMP=patch      # Bump (patch|minor|major)
make version-tag                  # git tag v$(VERSION) + push
```

## Install & Maintenance

```bash
make install           # All dependencies
make install-backend   # pip install -r requirements.txt
make install-frontend  # npm install
make doctor            # Check system requirements
make clean             # Remove build artifacts
make install-precommit # Install pre-commit hooks
make precommit         # Run pre-commit hooks
```

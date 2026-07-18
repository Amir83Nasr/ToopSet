# ────────────────────────────────────────────────────────────
# ToopSet — Backend  (multi-stage build)
# Build:  docker build -t toopset-backend ./backend
# ────────────────────────────────────────────────────────────

# ── Builder stage ──────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Build deps (gcc for bcrypt)
RUN apt-get update && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies before copying code (layer cache hit)
COPY requirements.txt .
RUN pip3 install --no-cache-dir --timeout 60 -r requirements.txt

# ── Runtime image ──────────────────────────────────────────
FROM python:3.12-slim

# Python runtime tuning
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Runtime deps (curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN addgroup --system --gid 1001 toopset && \
    adduser --system --uid 1001 --gid 1001 toopset

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY app/ ./app/
COPY alembic.ini ./
COPY migrations/ ./migrations/

# Writable directories
RUN mkdir -p /app/logs /app/uploads && chown -R toopset:toopset /app

USER toopset

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -sf http://localhost:${PORT:-8000}/health || exit 1

# Graceful shutdown: uvicorn traps SIGTERM, drains in-flight requests
# $PORT is injected by Railway at runtime (defaults to 8000 for local Docker).
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --timeout-graceful-shutdown 30

# ────────────────────────────────────────────────────────────
# ToopSet — Backend
# Build:  docker build -t toopset-backend ./backend
# ────────────────────────────────────────────────────────────

FROM python:3.12-slim AS builder

WORKDIR /build

# Install build deps
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip3 install --no-cache-dir --timeout 60 -r requirements.txt

# ── Runtime image ──────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 toopset && \
    adduser --system --uid 1001 --gid 1001 toopset

# Copy installed packages
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY app/ ./app/
COPY alembic.ini ./app/
COPY migrations/ ./app/migrations/

RUN mkdir -p /app/logs /app/uploads && chown -R toopset:toopset /app

USER toopset

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

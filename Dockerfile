# ────────────────────────────────────────────────────────────
# ToopSet — single Docker image (frontend + backend)
# Build:  docker build -t toopset .
# Run:    docker run -p 3000:3000 -p 8000:8000 --env-file .env toopset
# ────────────────────────────────────────────────────────────

# ── Stage 1: Frontend build ──────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ── Stage 2: Backend Python dependencies ─────────────────
FROM python:3.12-slim AS backend-deps
WORKDIR /build
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 3: Final image ─────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# ── Install Node.js (for Next.js production server) ─────
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gcc libpq-dev && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Copy installed Python packages ──────────────────────
COPY --from=backend-deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=backend-deps /usr/local/bin /usr/local/bin

# ── Copy backend source ─────────────────────────────────
COPY backend/ ./backend/

# ── Copy built frontend ─────────────────────────────────
COPY --from=frontend-builder /build/.next ./frontend/.next
COPY --from=frontend-builder /build/public ./frontend/public
COPY --from=frontend-builder /build/package.json ./frontend/package.json
COPY --from=frontend-builder /build/node_modules ./frontend/node_modules

# ── Create logs directory (for Logstash / ELK) ─────────
RUN mkdir -p /app/logs

# ── Install supervisord to manage both processes ────────
RUN pip install --no-cache-dir supervisor

# ── Supervisor config ───────────────────────────────────
COPY <<"EOF" /etc/supervisor/supervisord.conf
[supervisord]
nodaemon=true
user=root
logfile=/dev/null
pidfile=/tmp/supervisord.pid

[program:backend]
command=uvicorn app.main:app --host 0.0.0.0 --port 8000
directory=/app/backend
environment=
    POSTGRES_HOST="%(ENV_POSTGRES_HOST)s",
    REDIS_HOST="%(ENV_REDIS_HOST)s",
    LOG_LEVEL="%(ENV_LOG_LEVEL)s",
    SECRET_KEY="%(ENV_SECRET_KEY)s",
    PAYMENT_GATEWAY="%(ENV_PAYMENT_GATEWAY)s",
    SMS_PROVIDER="%(ENV_SMS_PROVIDER)s"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:frontend]
command=npm run start -- -p 3000
directory=/app/frontend
environment=
    NODE_ENV="production",
    NEXT_PUBLIC_API_URL="%(ENV_NEXT_PUBLIC_API_URL)s"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
EOF

EXPOSE 3000 8000

CMD ["supervisord", "-c", "/etc/supervisor/supervisord.conf"]

# ── Stage 1: dependencies ──────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# ── Stage 2: build ────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000}
RUN npm run build

# ── Stage 3: production runner (standalone) ────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nextjs && \
    useradd --system --uid 1001 -g nextjs nextjs

# Copy standalone output (includes pruned node_modules + compiled app)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Public files are served from /.next/static by standalone, but /public needs
# to be copied into the standalone directory so Next.js can serve them.
RUN cp -r public/* .next/static/ 2>/dev/null || true

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]

# ── Stage 1: dependencies ──────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app
ENV COREPACK_ENABLE_STRICT=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack install
RUN pnpm install --frozen-lockfile

# ── Stage 2: build ────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app
ENV COREPACK_ENABLE_STRICT=0
COPY package.json pnpm-workspace.yaml ./
RUN corepack enable && corepack install
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000}
RUN pnpm build

# ── Stage 3: production runner ────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nextjs && \
    useradd --system --uid 1001 -g nextjs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(response => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "node_modules/next/dist/bin/next", "start"]

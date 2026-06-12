# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Install production deps only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Cloud Run expects PORT env var and non-root user
RUN addgroup -S mcpgroup && adduser -S mcpuser -G mcpgroup
USER mcpuser

ENV TRANSPORT=http
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "dist/index.js"]

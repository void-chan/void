# Backend Dockerfile
# ── Build stage ──────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ── Runtime stage ────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/

# Storage volume — will be mounted at runtime
RUN mkdir -p storage/uploads && chown -R appuser:appgroup storage

USER appuser

EXPOSE 4000
ENV NODE_ENV=production

CMD ["node", "src/server.js"]

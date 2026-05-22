# Backend Dockerfile
# ── Build stage ──────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ── Runtime stage ────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/

# Ensure data and uploads directories exist
RUN mkdir -p /data storage/uploads

EXPOSE 4000
ENV NODE_ENV=production

CMD ["node", "src/server.js"]

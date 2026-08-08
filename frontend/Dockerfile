# ─── Dev stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]


# ─── Builder stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Требуется для standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Публичный URL сайта — подставляется на этапе сборки (для canonical/OG)
ARG SITE_URL
ENV SITE_URL=${SITE_URL}

RUN npm run build


# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

ARG SITE_URL
ENV SITE_URL=${SITE_URL}

# Только то, что нужно для запуска standalone-сервера
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Непривилегированный пользователь
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]

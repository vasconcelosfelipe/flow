# syntax=docker/dockerfile:1

# ---- deps: só instala pacotes, cacheia bem entre builds ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compila o Next com o output standalone ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL e BETTER_AUTH_SECRET são exigidos pelo config em build-time.
# Placeholders aqui; valores reais vêm do .env em runtime.
ENV DATABASE_URL=postgresql://build:placeholder@localhost:5432/build
ENV BETTER_AUTH_SECRET=build-placeholder-secret-32chars!!
RUN npx prisma generate --config prisma/prisma.config.ts
RUN npm run build

# ---- runner: standalone + prisma CLI para migrate ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma CLI + client gerado + schema/migrations/config para migrate deploy
COPY --from=builder /app/node_modules/.bin/prisma          ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma               ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma              ./node_modules/@prisma
COPY --from=builder /app/prisma                            ./prisma

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]

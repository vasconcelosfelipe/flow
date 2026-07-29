#!/usr/bin/env bash
# Roda em /opt/flow, na VPS, depois de um git pull.
# Reconstrói a imagem, aplica migrations pendentes e reinicia o app.
set -euo pipefail

echo "==> Build e subida dos containers"
docker compose build
docker compose up -d

echo "==> Aguardando banco ficar saudável..."
until docker compose exec -T db pg_isready -U "${POSTGRES_USER:-flow}" -q; do
  sleep 2
done

echo "==> Aplicando migrations Prisma"
docker compose exec -T app npx prisma migrate deploy \
  --config prisma/prisma.config.ts \
  2>&1

echo "==> Containers em execução"
docker compose ps

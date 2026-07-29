#!/usr/bin/env bash
# Roda em /opt/flow, na VPS, depois de um git pull.
# Reconstrói a imagem, aplica migrations pendentes e reinicia o app.
set -euo pipefail

# Carrega variáveis do .env para ter POSTGRES_USER/DB disponíveis no script
if [ -f .env ]; then
  export "$(grep -v '^#' .env | grep '=' | xargs)"
fi

echo "==> Build e subida dos containers"
docker compose build
docker compose up -d

echo "==> Aguardando banco ficar saudável..."
until docker compose exec -T db pg_isready -U "${POSTGRES_USER:-flow}" -q; do
  sleep 2
done

echo "==> Aplicando migrations pendentes"
# Aplica cada arquivo SQL novo (ainda não presente em _prisma_migrations)
for sql in prisma/migrations/*/migration.sql; do
  name=$(basename "$(dirname "$sql")")
  already=$(docker compose exec -T db psql \
    -U "${POSTGRES_USER:-flow}" -d "${POSTGRES_DB:-flow}" -tAq \
    -c "SELECT count(*) FROM _prisma_migrations WHERE migration_name='$name' AND finished_at IS NOT NULL" 2>/dev/null || echo 0)
  if [ "$already" = "0" ]; then
    echo "  Aplicando $name..."
    docker compose exec -T db psql \
      -U "${POSTGRES_USER:-flow}" -d "${POSTGRES_DB:-flow}" \
      < "$sql"
    docker compose exec -T db psql \
      -U "${POSTGRES_USER:-flow}" -d "${POSTGRES_DB:-flow}" \
      -c "INSERT INTO _prisma_migrations (id,checksum,finished_at,migration_name,applied_steps_count) \
          VALUES (gen_random_uuid()::text,'manual',now(),'$name',1) ON CONFLICT DO NOTHING;"
    echo "  OK"
  else
    echo "  Skipping $name (já aplicada)"
  fi
done

echo "==> Containers em execução"
docker compose ps

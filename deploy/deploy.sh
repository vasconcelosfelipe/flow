#!/usr/bin/env bash
# Roda em /opt/flow, na VPS, depois que o código mais novo já chegou lá
# (rsync ou git pull, conforme o projeto tiver remoto configurado).
set -euo pipefail

echo "==> Build e subida dos containers"
docker compose build
docker compose up -d

echo "==> Containers em execução"
docker compose ps

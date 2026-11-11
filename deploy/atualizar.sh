#!/usr/bin/env bash
# Atualiza o piloto com o que o CI publicou: baixa as imagens novas do ghcr.io e recria só o que mudou.
# É o que o agendamento (cron) roda de tempos em tempos; também pode ser rodado à mão: bash deploy/atualizar.sh
# Os dados (volumes do banco e dos anexos) não são tocados.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[$(date '+%F %T')] verificando atualizações"

# Traz mudanças do compose/Nginx/scripts. Se falhar (repositório privado sem credencial), segue com as imagens.
git pull --ff-only -q || echo "git pull não aplicado (seguindo com as imagens)"

docker compose pull -q
docker compose up -d --remove-orphans

# Mudança no arquivo do Nginx não recria o contêiner; recarrega a configuração.
docker compose exec -T nginx nginx -s reload >/dev/null 2>&1 || true

docker image prune -f >/dev/null
echo "[$(date '+%F %T')] ok"

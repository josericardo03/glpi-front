#!/usr/bin/env bash
# Sobe (ou atualiza) o piloto inteiro: banco, API, front, Nginx e backup.
#
#   bash deploy/iniciar.sh --url http://teste-glpi.sema.mt.gov.br   # primeira vez
#   bash deploy/iniciar.sh                                          # atualizar depois de um git pull
#   bash deploy/iniciar.sh --imagens                                # baixa as imagens prontas do ghcr.io em vez de construir
#
# Na primeira vez gera o arquivo .env com segredos aleatórios. GUARDE esse arquivo: a senha do Postgres fica
# gravada no volume do banco e, se o .env se perder, a API deixa de conseguir entrar nele.
set -euo pipefail
cd "$(dirname "$0")/.."

URL=""
IMAGENS=0
while [ $# -gt 0 ]; do
  case "$1" in
    --url) URL="${2:-}"; shift 2 ;;
    --imagens) IMAGENS=1; shift ;;
    *) echo "Opção desconhecida: $1" >&2; exit 1 ;;
  esac
done

command -v docker >/dev/null 2>&1 || { echo "Docker não encontrado. Rode antes: bash deploy/preparar-servidor.sh" >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "Sem permissão no Docker. Saia e entre de novo no SSH (grupo docker) ou use sudo." >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Plugin 'docker compose' não encontrado." >&2; exit 1; }

if [ "$IMAGENS" -eq 0 ] && [ ! -d ../glpi-back ]; then
  echo "A pasta ../glpi-back não existe. Clone o repositório da API ao lado deste, ou use --imagens." >&2
  exit 1
fi

gerar() { openssl rand -base64 96 | tr -dc 'A-Za-z0-9' | head -c "$1"; }

SENHA_ADMIN=""
if [ ! -f .env ]; then
  command -v openssl >/dev/null 2>&1 || { echo "openssl não encontrado." >&2; exit 1; }
  SENHA_ADMIN="$(gerar 14)@Aa1"
  ( umask 077
    cat > .env <<EOF
POSTGRES_PASSWORD=$(gerar 32)
JWT_SECRET=$(gerar 64)
INTEGRACOES_SECRET=$(gerar 64)
METRICS_TOKEN=$(gerar 32)
SEED_ADMIN_EMAIL=admin@itsm.local
SEED_ADMIN_PASSWORD=$SENHA_ADMIN
APP_URL=$URL
CORS_ORIGIN=
EOF
  )
  echo "==> Criei o .env com segredos novos. Faça uma cópia segura dele."
elif [ -n "$URL" ]; then
  echo "Aviso: o .env já existe e --url foi ignorado. Edite APP_URL no .env se precisar mudar." >&2
fi

if [ "$IMAGENS" -eq 1 ]; then
  docker compose pull
  docker compose up -d
else
  docker compose up -d --build
fi

echo "==> Esperando a API ficar saudável"
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1/api/health >/dev/null 2>&1; then
    echo "API no ar."
    break
  fi
  sleep 3
done
docker compose ps

echo
if [ -n "$SENHA_ADMIN" ]; then
  echo "Primeiro acesso:  admin@itsm.local  /  $SENHA_ADMIN"
  echo "(Anote agora e troque no sistema. Essa senha não será mostrada de novo; ela fica só no .env.)"
fi
echo "Acesse: ${URL:-http://IP-DO-SERVIDOR}"

#!/usr/bin/env bash
# Um comando só num servidor Rocky Linux novo: Docker, firewall, banco, API, front, Nginx, backup e
# atualização automática. Rode de dentro do glpi-front já clonado, como usuário comum com sudo:
#
#   bash deploy/subir-tudo.sh --url http://teste-glpi.sema.mt.gov.br
#
# Opções:
#   --url URL                      endereço público (vai para APP_URL)
#   --imagens                      usa as imagens prontas do ghcr.io em vez de construir no servidor
#   --sem-atualizacao-automatica   não agenda o CD
set -euo pipefail
cd "$(dirname "$0")/.."

URL=""
IMAGENS=0
AUTO=1
while [ $# -gt 0 ]; do
  case "$1" in
    --url) URL="${2:-}"; shift 2 ;;
    --imagens) IMAGENS=1; shift ;;
    --sem-atualizacao-automatica) AUTO=0; shift ;;
    *) echo "Opção desconhecida: $1" >&2; exit 1 ;;
  esac
done

# A API é construída a partir de ../glpi-back. Se não estiver lá, clona o repositório irmão.
if [ "$IMAGENS" -eq 0 ] && [ ! -d ../glpi-back ]; then
  ORIGEM="$(git remote get-url origin | sed 's#glpi-front#glpi-back#')"
  echo "==> Clonando a API em ../glpi-back ($ORIGEM)"
  git clone "$ORIGEM" ../glpi-back
fi

echo "==> 1/3 Preparando o servidor (Docker e firewall)"
bash deploy/preparar-servidor.sh

# Acabamos de entrar no grupo docker; `sg` aplica o grupo sem precisar sair e entrar no SSH.
ARGS_INICIAR=()
[ -n "$URL" ] && ARGS_INICIAR+=(--url "$URL")
[ "$IMAGENS" -eq 1 ] && ARGS_INICIAR+=(--imagens)

echo "==> 2/3 Subindo a aplicação"
sg docker -c "$(printf '%q ' bash deploy/iniciar.sh "${ARGS_INICIAR[@]}")"

if [ "$AUTO" -eq 1 ]; then
  echo "==> 3/3 Ligando a atualização automática"
  if ! sg docker -c "bash deploy/atualizacao-automatica.sh"; then
    echo "A aplicação está no ar, mas a atualização automática não foi ligada (veja a mensagem acima)." >&2
  fi
fi

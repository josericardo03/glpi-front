#!/usr/bin/env bash
# Liga a atualização automática (o "CD" do piloto): a cada N minutos o servidor roda deploy/atualizar.sh.
# Quando você dá push na main, o GitHub constrói as imagens (CI) e, em até N minutos, o servidor as aplica.
#
#   bash deploy/atualizacao-automatica.sh        # a cada 5 minutos
#   bash deploy/atualizacao-automatica.sh 15     # a cada 15 minutos
#   bash deploy/atualizacao-automatica.sh --desligar
#
# Por que assim: o servidor tem IP interno e o GitHub não consegue entrar por SSH nele. Aqui é o servidor
# que busca as novidades, só com saída para a internet.
set -euo pipefail
cd "$(dirname "$0")/.."
RAIZ="$(pwd)"
MARCA="$RAIZ/deploy/atualizar.sh"

if [ "${1:-}" = "--desligar" ]; then
  { crontab -l 2>/dev/null | grep -v -F "$MARCA" || true; } | crontab -
  echo "Atualização automática desligada."
  exit 0
fi

INTERVALO="${1:-5}"
case "$INTERVALO" in ''|*[!0-9]*) echo "Intervalo inválido: use um número de minutos." >&2; exit 1 ;; esac
[ "$INTERVALO" -ge 1 ] && [ "$INTERVALO" -le 59 ] || { echo "Use um intervalo de 1 a 59 minutos." >&2; exit 1; }

echo "==> Testando se as imagens podem ser baixadas do ghcr.io"
if ! docker compose pull -q; then
  cat >&2 <<'EOF'

Não consegui baixar as imagens. As causas comuns:
  - Os pacotes do GitHub são privados. Torne-os públicos (GitHub > seu perfil > Packages >
    glpi-back e glpi-front > Package settings > Change visibility), OU entre com um token de leitura:
        docker login ghcr.io -u SEU_USUARIO_GITHUB
    (a senha é um token com permissão read:packages; digite só no terminal).
  - O CI ainda não publicou as imagens: veja a aba Actions dos dois repositórios.
  - A rede bloqueia o ghcr.io.
Depois rode este script de novo. Nada foi agendado.
EOF
  exit 1
fi

echo "==> Garantindo o agendador (cron)"
if ! command -v crontab >/dev/null 2>&1; then
  sudo dnf -y install cronie
fi
sudo systemctl enable --now crond

LOG="$HOME/glpi-atualizar.log"
LINHA="*/$INTERVALO * * * * flock -n /tmp/glpi-atualizar.lock bash $RAIZ/deploy/atualizar.sh >> $LOG 2>&1"
# `|| true`: o grep sai com 1 quando não sobra nenhuma linha (agenda vazia), e o set -e abortaria antes de gravar.
{ crontab -l 2>/dev/null | grep -v -F "$MARCA" || true; echo "$LINHA"; } | crontab -

echo
echo "Atualização automática ligada: a cada $INTERVALO min. Registro em $LOG"
echo "Para desligar: bash deploy/atualizacao-automatica.sh --desligar"

#!/bin/sh
# Restaura um backup feito por backup.sh. DESTRUTIVO: substitui o conteúdo do banco de destino.
#
#   CONFIRMO=sim ./restaurar.sh <itsm-AAAAMMDDTHHMMSSZ.dump> [anexos-AAAAMMDDTHHMMSSZ.tar.gz]
#
# Destino: RESTAURAR_DATABASE_URL, DIRECT_URL ou DATABASE_URL (ou PGHOST/PGUSER/PGPASSWORD/PGDATABASE).
# Anexos são extraídos em ANEXOS_DIR. Pare a API antes e suba de novo depois: ao iniciar, ela confere as migrações.
set -eu

DUMP="${1:-}"
ANEXOS="${2:-}"
[ -n "$DUMP" ] && [ -f "$DUMP" ] || { echo "Uso: CONFIRMO=sim $0 <arquivo.dump> [anexos.tar.gz]" >&2; exit 2; }
[ "${CONFIRMO:-}" = "sim" ] || { echo "Isto SUBSTITUI os dados do banco de destino. Repita com CONFIRMO=sim." >&2; exit 2; }

# Confere a soma de verificação, se o backup a trouxe.
PASTA="$(dirname "$DUMP")"
BASE="$(basename "$DUMP")"
CARIMBO="${BASE#itsm-}"; CARIMBO="${CARIMBO%.dump}"
if [ -f "$PASTA/SHA256-$CARIMBO.txt" ]; then
  ( cd "$PASTA" && sha256sum -c "SHA256-$CARIMBO.txt" ) || { echo "Soma de verificação não confere: backup corrompido." >&2; exit 1; }
fi

CONEXAO="${RESTAURAR_DATABASE_URL:-${DIRECT_URL:-${DATABASE_URL:-}}}"
CONEXAO="$(printf '%s' "$CONEXAO" | sed -E 's/([?&])schema=[^&]*&?/\1/; s/[?&]$//')"

if [ -n "$CONEXAO" ]; then
  pg_restore --clean --if-exists --no-owner --exit-on-error --single-transaction --dbname="$CONEXAO" "$DUMP"
else
  pg_restore --clean --if-exists --no-owner --exit-on-error --single-transaction "$DUMP"
fi
echo "Banco restaurado de $DUMP"

if [ -n "$ANEXOS" ]; then
  [ -f "$ANEXOS" ] || { echo "Arquivo de anexos não encontrado: $ANEXOS" >&2; exit 1; }
  DESTINO="${ANEXOS_DIR:-./storage}"
  mkdir -p "$DESTINO"
  tar -xzf "$ANEXOS" -C "$DESTINO"
  echo "Anexos extraídos em $DESTINO"
fi

#!/bin/sh
# Backup do banco (pg_dump formato custom) e dos anexos em disco, com verificação e retenção.
#
# Conexão: BACKUP_DATABASE_URL, DIRECT_URL ou DATABASE_URL; sem nenhuma delas valem as variáveis PGHOST/PGUSER/PGPASSWORD/PGDATABASE.
#   BACKUP_DIR            destino (padrão ./backups)
#   ANEXOS_DIR            se existir, é empacotado junto (anexos em disco ficam FORA do banco)
#   BACKUP_RETENCAO_DIAS  apaga backups mais velhos que isso (padrão 14; 0 desliga)
#
# Sai com erro se o dump não puder ser lido de volta: um backup que não restaura não é backup.
set -eu

DIR="${BACKUP_DIR:-./backups}"
RETENCAO="${BACKUP_RETENCAO_DIAS:-14}"
CARIMBO="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DIR"

CONEXAO="${BACKUP_DATABASE_URL:-${DIRECT_URL:-${DATABASE_URL:-}}}"
# O Prisma aceita ?schema=public na URL; o libpq (pg_dump) não.
CONEXAO="$(printf '%s' "$CONEXAO" | sed -E 's/([?&])schema=[^&]*&?/\1/; s/[?&]$//')"

DUMP="$DIR/itsm-$CARIMBO.dump"
TMP="$DUMP.parcial"
trap 'rm -f "$TMP"' EXIT

if [ -n "$CONEXAO" ]; then
  pg_dump --format=custom --no-owner --file="$TMP" "$CONEXAO"
else
  pg_dump --format=custom --no-owner --file="$TMP"
fi

# O índice do arquivo precisa ser legível e conter as tabelas principais.
pg_restore --list "$TMP" > /dev/null
pg_restore --list "$TMP" | grep -q ' TABLE .* chamados ' || { echo "Dump sem a tabela chamados: backup recusado." >&2; exit 1; }
mv "$TMP" "$DUMP"
echo "Banco: $DUMP ($(wc -c < "$DUMP") bytes)"

if [ -n "${ANEXOS_DIR:-}" ] && [ -d "$ANEXOS_DIR" ]; then
  ARQ="$DIR/anexos-$CARIMBO.tar.gz"
  tar -czf "$ARQ" -C "$ANEXOS_DIR" .
  echo "Anexos: $ARQ ($(wc -c < "$ARQ") bytes)"
fi

# Soma de verificação para detectar corrupção/adulteração na hora de restaurar.
( cd "$DIR" && sha256sum "itsm-$CARIMBO.dump" $( [ -f "anexos-$CARIMBO.tar.gz" ] && echo "anexos-$CARIMBO.tar.gz" ) > "SHA256-$CARIMBO.txt" )

if [ "$RETENCAO" -gt 0 ] 2>/dev/null; then
  find "$DIR" -maxdepth 1 -type f \( -name 'itsm-*.dump' -o -name 'anexos-*.tar.gz' -o -name 'SHA256-*.txt' \) -mtime "+$RETENCAO" -exec rm -f {} \;
fi
echo "Backup concluído: $CARIMBO"

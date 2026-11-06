#!/bin/sh
# Loop do serviço `backup` do docker-compose: faz um backup ao subir e depois a cada BACKUP_INTERVALO_HORAS.
# Uma falha não derruba o serviço (tenta de novo no próximo ciclo) e fica registrada no log do container.
INTERVALO="${BACKUP_INTERVALO_HORAS:-24}"
while true; do
  if sh /backup/backup.sh; then
    echo "[backup] ok"
  else
    echo "[backup] FALHOU" >&2
  fi
  sleep "$((INTERVALO * 3600))"
done

#!/bin/sh
set -e
cd "$(dirname "$0")"
if [ ! -f ../glpi-back/Dockerfile ]; then
  echo "Coloque a pasta glpi-back ao lado desta (../glpi-back)."
  exit 1
fi
docker compose up -d --build

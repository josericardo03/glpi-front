#!/usr/bin/env bash
# Prepara um servidor Rocky Linux / RHEL (8 ou 9) para rodar o piloto: Docker CE, Compose e firewall.
# Rode UMA vez, como usuário comum com sudo (não como root):  bash deploy/preparar-servidor.sh
# O SELinux continua ativo: o docker-compose.yml já usa `:z` nos volumes montados.
set -euo pipefail

if [ "$(id -u)" -eq 0 ]; then
  echo "Rode como usuário comum com sudo, não como root." >&2
  exit 1
fi
if ! command -v dnf >/dev/null 2>&1; then
  echo "Este script é para Rocky Linux / RHEL (usa dnf)." >&2
  exit 1
fi

USUARIO="$(id -un)"

echo "==> Pacotes básicos"
sudo dnf -y install dnf-plugins-core git curl openssl

# O Podman traz um pacote que imita o comando `docker` e conflita com o Docker CE.
if rpm -q podman-docker >/dev/null 2>&1; then
  echo "==> Removendo podman-docker (conflita com o Docker CE)"
  sudo dnf -y remove podman-docker
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Instalando o Docker CE (repositório oficial)"
  sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
  sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "==> Docker já instalado: $(docker --version)"
fi

echo "==> Ligando o Docker no boot"
sudo systemctl enable --now docker

echo "==> Permitindo que $USUARIO use o Docker sem sudo"
sudo usermod -aG docker "$USUARIO"

if systemctl is-active --quiet firewalld; then
  echo "==> Liberando as portas 80 e 443 no firewalld"
  sudo firewall-cmd --permanent --add-service=http --add-service=https
  sudo firewall-cmd --reload
  # O reload do firewalld descarta as regras do Docker; reiniciar o Docker as recria.
  sudo systemctl restart docker
else
  echo "==> firewalld não está ativo; nada a liberar aqui (confira o firewall da rede)."
fi

echo
echo "Pronto. SELinux: $(getenforce 2>/dev/null || echo 'não disponível')"
echo "Saia e entre de novo no SSH para o grupo 'docker' valer, depois rode:"
echo "  bash deploy/iniciar.sh --url http://SEU-DOMINIO"

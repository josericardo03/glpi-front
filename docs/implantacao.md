# Implantação no servidor (Rocky Linux)

Sobe tudo junto: Postgres, API, front, Nginx e backup diário. O banco é criado vazio e a API aplica as
migrações e cria o administrador inicial sozinha.

## Antes de começar

- VM Rocky Linux com as portas 80 e 443 de entrada e saída para `github.com`, `ghcr.io`,
  `registry-1.docker.io` e `download.docker.com`.
- Usuário com `sudo`. Troque a senha inicial e use chave SSH.

## Primeira vez

```bash
# 1. Clonar os dois repositórios LADO A LADO
git clone https://github.com/josericardo03/glpi-back.git
git clone https://github.com/josericardo03/glpi-front.git
cd glpi-front

# 2. Instalar Docker e liberar o firewall (uma vez só)
bash deploy/preparar-servidor.sh
# saia e entre de novo no SSH para o grupo docker valer

# 3. Subir tudo
cd glpi-front
bash deploy/iniciar.sh --url http://teste-glpi.sema.mt.gov.br
```

O passo 3 cria o `.env` com segredos aleatórios, constrói as imagens, sobe os cinco serviços e mostra o
login do administrador **uma única vez**. Depois abra o endereço no navegador.

> **Guarde o `.env`.** A senha do Postgres fica gravada no volume do banco. Se o arquivo se perder, a API
> não entra mais no banco. Faça uma cópia fora do servidor.

## Depois de subir

1. Entre como administrador e **troque a senha**.
2. Administração → Integrações: configure o SMTP e faça um envio de teste.
3. Administração → Identidade Visual: envie o logotipo e publique.

## Atualizar

```bash
cd glpi-back  && git pull
cd ../glpi-front && git pull
bash deploy/iniciar.sh
```

Os dados ficam nos volumes `pgdata` e `anexos`, então reconstruir não apaga nada. Para baixar imagens
prontas do `ghcr.io` em vez de construir no servidor, use `bash deploy/iniciar.sh --imagens`.

## HTTPS

1. Peça à SEMA o certificado do domínio e coloque em `certs/`: `fullchain.pem` (certificado + cadeia) e
   `privkey.pem`.
2. `cp nginx/https.conf.example nginx/default.conf`
3. `docker compose up -d --force-recreate nginx`
4. Em `.env`, troque `APP_URL` para `https://...` e rode `docker compose up -d`.

## Backup

Roda sozinho a cada 24 h e guarda 14 dias no volume `backups`. Esse volume fica **no mesmo servidor**:
copie periodicamente para outro lugar. Detalhes e restauração em `glpi-back/docs/operacao.md`.

```bash
docker compose exec backup sh /backup/backup.sh   # backup agora
```

## Deploy automático (opcional)

Os workflows `docker.yml` só fazem o deploy se a variável `DEPLOY_HOST` existir no GitHub. Se você ligar
isso, o workflow **sobrescreve o `.env`** com os segredos do GitHub. Então copie para lá os mesmos valores
do `.env` atual (principalmente `POSTGRES_PASSWORD`, `JWT_SECRET` e `INTEGRACOES_SECRET`), ou o banco e as
integrações já gravadas deixam de funcionar.

## Problemas comuns

| Sintoma | O que olhar |
|---|---|
| `permission denied` no Nginx ou no backup | SELinux: `sudo ausearch -m avc -ts recent`. Os volumes já usam `:z`. Não desligue o SELinux. |
| `docker compose pull` ou o build não baixa nada | Saída para `ghcr.io` e `registry-1.docker.io` bloqueada; confira o proxy/firewall da rede. |
| Contêineres sem internet depois de mexer no firewall | `sudo systemctl restart docker` (o firewalld descarta as regras do Docker). |
| Anexos não gravam | `docker compose logs api`. A pasta `/dados/anexos` precisa pertencer ao usuário `nestjs` (a imagem já faz isso). |
| API não sobe | `docker compose logs api`; a migração que falhou aparece pelo nome. |
| Esqueci a senha do admin | Está no `.env` (`SEED_ADMIN_PASSWORD`), mas só vale se ela ainda não foi trocada no sistema. |

Comandos úteis: `docker compose ps`, `docker compose logs -f api`, `docker compose restart api`.

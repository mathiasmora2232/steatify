#!/usr/bin/env bash
# Prepara la VPS para los despliegues de Steatify. Se ejecuta UNA vez, como root, en la VPS:
#   desde tu PC:  ssh -p 22022 root@104.207.89.48 'bash -s' < scripts/vps-bootstrap-steatify.sh
#   o en la VPS:  sudo bash scripts/vps-bootstrap-steatify.sh
# Crea el usuario `steatify` (grupo docker, solo clave SSH), /opt/steatify y un .env inicial con los secretos ya generados.
# Es idempotente: se puede repetir sin pisar un .env existente. No imprime secretos.
set -Eeuo pipefail
[ "$(id -u)" = 0 ] || { echo "Ejecuta como root (sudo)." >&2; exit 1; }
getent group docker >/dev/null || { echo "Docker no está instalado (no existe el grupo docker)." >&2; exit 1; }

USUARIO=steatify
APP=/opt/steatify
# Clave pública del deploy (no es secreta): va incluida para poder ejecutar el script con un solo comando por SSH.
PUB='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICgxlW8yCV5QtK4yOHQn4/PPLBKbJTuktAJXQby9gRmY steatify-deploy@github-actions'

id "$USUARIO" >/dev/null 2>&1 || useradd -m -s /bin/bash "$USUARIO"
usermod -aG docker "$USUARIO"
install -d -m 700 -o "$USUARIO" -g "$USUARIO" "/home/$USUARIO/.ssh"
AK="/home/$USUARIO/.ssh/authorized_keys"
touch "$AK"; grep -qxF "$PUB" "$AK" || printf '%s\n' "$PUB" >> "$AK"
chown "$USUARIO:$USUARIO" "$AK"; chmod 600 "$AK"
install -d -m 755 -o "$USUARIO" -g "$USUARIO" "$APP"
install -d -m 700 -o "$USUARIO" -g "$USUARIO" "/home/$USUARIO/backups"

gen() { openssl rand -base64 "$1" | tr -d '\n'; }
hex() { openssl rand -hex "$1"; }
if [ -f "$APP/.env" ]; then
  echo ".env ya existe en $APP: no se toca."
else
  # La contraseña del Postgres principal (SmartAhorra) la lee root del propio contenedor; si no se puede, queda vacía para rellenarla a mano.
  DBPASS="$(docker exec shopdb-postgres printenv POSTGRES_PASSWORD 2>/dev/null || true)"
  PGPASS="$(hex 24)"
  umask 077
  cat > "$APP/.env" <<ENV
NODE_ENV=production
DB_PASSWORD=$DBPASS
SHOPDB_POSTGRES_CONTAINER=shopdb-postgres
SHOPDB_ADMIN_USER=shopdb
SHOPDB_ADMIN_DB=postgres
POSTGRES_DB=steatify
POSTGRES_USER=steatify
POSTGRES_PASSWORD=$PGPASS
DATABASE_URL=postgresql://steatify:$PGPASS@shopdb-postgres:5432/steatify?schema=public
STEATIFY_BACKUP_DIR=/home/$USUARIO/backups
STEATIFY_KEEP_BACKUPS=5
REDIS_HOST=shopdb-redis
REDIS_PORT=6379
REDIS_URL=redis://shopdb-redis:6379/2
BACKEND_PORT=4000
BACKEND_PUBLIC_URL=https://api.steatify.lat
FRONTEND_URL=https://steatify.lat
NEXT_PUBLIC_API_URL=https://api.steatify.lat/api
BACKEND_INTERNAL_URL=http://backend:4000
JWT_SECRET=$(gen 48)
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=2592000
TOKEN_ENC_KEY=$(gen 32)
SPOTIFY_CLIENT_ID=dc7b595c9d35431ca1ea7fae61a9970a
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=https://api.steatify.lat/api/auth/spotify/callback
ML_SERVICE_URL=http://ml-service:8000
ML_SERVICE_PORT=8000
ANTHROPIC_API_KEY=
STEAM_API_KEY=
TUNNEL_TOKEN=
ENV
  chown "$USUARIO:$USUARIO" "$APP/.env"; chmod 600 "$APP/.env"
  echo ".env creado en $APP con JWT_SECRET, TOKEN_ENC_KEY y la contraseña del rol steatify generados."
fi

echo
echo "Listo. Pendiente en $APP/.env (a mano, solo estos):"
for k in DB_PASSWORD SPOTIFY_CLIENT_ID SPOTIFY_CLIENT_SECRET TUNNEL_TOKEN; do
  v="$(grep -E "^$k=" "$APP/.env" | cut -d= -f2-)"; [ -n "$v" ] && echo "  $k: ya tiene valor" || echo "  $k: VACÍO"
done
echo "(ANTHROPIC_API_KEY y STEAM_API_KEY son opcionales; TUNNEL_TOKEN lo copia el deploy si existe el secreto CLOUDFLARE_TUNNEL_TOKEN.)"

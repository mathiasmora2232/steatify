# Despliegue — Steatify

Repositorio activo: `https://github.com/mathiasmora2232/steatify.git`. Dominio del frontend: `https://steatify.lat`; backend previsto: `https://api.steatify.lat`. Ver `.env.production.example` para URLs y callback de Spotify. Registrar ese callback en Spotify y configurar DNS y HTTPS antes de publicar.

El workflow ejecuta tests en cada push a `main`. El despliegue al VPS se inicia manualmente con `workflow_dispatch` y requiere los secretos del entorno `Production` en el nuevo repositorio, con `VPS_APP_DIR=/opt/steatify`. La carpeta debe prepararse en el servidor con su `.env` real; el cambio de repositorio no migra automáticamente el servidor. Las instalaciones existentes pueden seguir usando su conexión de base de datos actual; no cambies el nombre de la base ni `DATABASE_URL` hasta completar y respaldar una migración explícita.

Dos caminos: **PaaS gestionado** (rápido, recomendado para MVP) o **VPS con Docker Compose** (más control). En ambos, lo crítico es: variables de entorno, migraciones, y que la **Redirect URI de Spotify coincida con tu dominio de producción**.

---

## Antes de nada — checklist

- [ ] Genera secretos de producción nuevos (no reuses los de dev):
  ```bash
  openssl rand -base64 48   # JWT_SECRET
  openssl rand -base64 32   # TOKEN_ENC_KEY
  ```
- [ ] En el [Spotify dashboard](https://developer.spotify.com/dashboard) añade la Redirect URI de prod:
  `https://api.steatify.lat/api/auth/spotify/callback`
- [ ] Define estas variables (ver `.env.example` para la lista completa):
  - `DATABASE_URL`, `REDIS_URL/REDIS_HOST/REDIS_PORT`
  - `JWT_SECRET`, `TOKEN_ENC_KEY`
  - `SPOTIFY_CLIENT_ID/SECRET`, `SPOTIFY_REDIRECT_URI` (la de prod)
  - `BACKEND_PUBLIC_URL`, `FRONTEND_URL`, `NEXT_PUBLIC_API_URL`
  - opcionales: `STEAM_API_KEY`, `ANTHROPIC_API_KEY`, `ML_SERVICE_URL`
  - `NODE_ENV=production`
- [ ] ⚠️ `NEXT_PUBLIC_API_URL` se **inyecta al compilar** el frontend → tiene que estar presente en el **build**, no solo en runtime.

---

## Opción A — PaaS gestionado (recomendado MVP)

| Componente | Servicio | Notas |
|---|---|---|
| Postgres | **Supabase** / Neon | Copia su `DATABASE_URL` (con `?sslmode=require`) |
| Redis | **Upstash** | Copia `REDIS_URL` (rediss://) |
| Backend + ml-service | **Railway** / Render | Despliega por Dockerfile |
| Frontend | **Vercel** | Build de Next.js nativo |

### 1. Base de datos (Supabase)
Crea un proyecto, copia la connection string a `DATABASE_URL`. Aplica el esquema:
```bash
cd backend
DATABASE_URL="postgres://...supabase..." npx prisma migrate deploy
DATABASE_URL="postgres://...supabase..." npm run prisma:seed   # logros base
```

### 2. Backend (Railway / Render)
- Servicio nuevo → *Deploy from repo* → Dockerfile: `docker/backend.Dockerfile`, contexto: raíz.
- Variables: todas las del checklist (apuntando a Supabase/Upstash).
- El contenedor corre `prisma migrate deploy && node dist/main.js` al arrancar (migra solo).
- Expón el puerto `4000`. Anota su URL pública → será `BACKEND_PUBLIC_URL` y la base de `NEXT_PUBLIC_API_URL`.

### 3. ml-service (opcional, mismo proveedor)
- Dockerfile: `docker/ml.Dockerfile`. Variable `ANTHROPIC_API_KEY` si quieres insights con Claude.
- Apunta `ML_SERVICE_URL` del backend a su URL interna.

### 4. Frontend (Vercel)
- Root del proyecto: `frontend/`. Framework: Next.js (autodetectado).
- Variable de entorno: `NEXT_PUBLIC_API_URL=https://api.steatify.lat/api`.
- Tras desplegar, pon su dominio en el backend como `FRONTEND_URL` (para CORS + redirect post-login).

### 5. Cerrar el círculo
- `SPOTIFY_REDIRECT_URI` (backend) = la registrada en Spotify.
- `FRONTEND_URL` (backend) = dominio de Vercel.
- `NEXT_PUBLIC_API_URL` (Vercel) = dominio del backend + `/api`.
- Redeploy si cambiaste algo de build.

---

## Opción B — VPS con Docker Compose

En un VPS (Ubuntu + Docker):

```bash
git clone https://github.com/mathiasmora2232/steatify.git steatify && cd steatify
cp .env.example .env        # edita con dominios/secretos de PROD
# Importante: NEXT_PUBLIC_API_URL=https://api.steatify.lat/api

docker compose --profile app up -d --build
```

Esto levanta **postgres, redis, backend, frontend y ml-service**. Las migraciones corren solas al arrancar el backend.

### Túnel de Cloudflare (opción recomendada en el VPS)
El `docker-compose.prod.yml` incluye el conector `cloudflared`: no hace falta Nginx ni abrir puertos. Se crea una vez en Cloudflare:
1. Zero Trust → Networks → Tunnels → **Create tunnel** → Cloudflared → nombre `steatify` (administrado desde Cloudflare). Copia el **token** (va a `TUNNEL_TOKEN`).
2. Public hostnames del túnel:

| Hostname | Servicio |
|---|---|
| `steatify.lat`, `www.steatify.lat`, `app.steatify.lat`, `auth.steatify.lat`, `admin.steatify.lat` | `http://frontend:3000` |
| `api.steatify.lat` | `http://backend:4000` |

   Cloudflare crea los registros DNS (si la raíz tiene un registro A de «parking», bórralo para que entre el CNAME).
3. Guarda el token como secreto del repositorio `CLOUDFLARE_TUNNEL_TOKEN` (el deploy lo copia al `.env` del servidor) o ponlo a mano en `/opt/steatify/.env` como `TUNNEL_TOKEN=...`.
4. Deploy normal (`workflow_dispatch`). El contenedor `cloudflared` arranca con el resto del stack.

### Reverse proxy + SSL (Nginx) — alternativa sin túnel
Pon Nginx delante enrutando:
- `steatify.lat`        → frontend `:3000`
- `api.steatify.lat`    → backend `:4000`

Con [Certbot](https://certbot.eff.org/) para SSL. Asegúrate de que `NEXT_PUBLIC_API_URL` se pasó como **build arg** (el compose ya lo hace desde `.env`).

### Backups
```bash
# Volcado diario de Postgres (cron)
docker compose exec -T postgres pg_dump -U steatify steatify | gzip > backup-$(date +%F).sql.gz
```

### Renombrar la base de datos existente

En una instalación ya desplegada, no basta con cambiar `DATABASE_URL`: primero copia los datos a la base `steatify`. Detén el backend, crea un respaldo con la configuración actual y guárdalo fuera del contenedor:

```bash
docker compose -f docker-compose.prod.yml stop backend
set -a && . ./.env && set +a
BACKUP_DIR="${STEATIFY_BACKUP_DIR:-/root/steatify/backups/supabase}"
mkdir -p "$BACKUP_DIR"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$SHOPDB_POSTGRES_CONTAINER" \
pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" \
> "$BACKUP_DIR/pre-steatify-rename.dump"
```

Después cambia `POSTGRES_DB`, `POSTGRES_USER` y `DATABASE_URL` en el `.env` real para apuntar a `steatify`, y ejecuta:

```bash
bash scripts/vps-init-steatify-db.sh
docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" "$SHOPDB_POSTGRES_CONTAINER" \
pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl \
< "$BACKUP_DIR/pre-steatify-rename.dump"
docker compose -f docker-compose.prod.yml up -d backend
```

Verifica la salud de `/api/health` y los datos antes de retirar la base anterior o su respaldo. Las claves antiguas de apariencia se convierten con la migración de Prisma al desplegar.

---

## Operación

- **Salud:** `GET /api/health` (incluye estado de BD) y la página `/dashboard/admin` (colas, syncs, tokens).
- **Jobs:** el sync de Spotify corre cada 30 min; el de Steam cada 6h (cron en el backend).
- **Logs:** `docker compose logs -f backend`.
- **Migrar tras un cambio de schema:** `npx prisma migrate deploy` (el contenedor lo hace al reiniciar).

---

## Lo que NO necesitas todavía
Kubernetes, multitenancy, pagos, CDN propia. Para un MVP de un usuario (o pocos), Railway + Supabase + Vercel sobra. Escala cuando el problema sea real, no antes.

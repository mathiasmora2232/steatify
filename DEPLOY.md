# Despliegue — Sonora

Dos caminos: **PaaS gestionado** (rápido, recomendado para MVP) o **VPS con Docker Compose** (más control). En ambos, lo crítico es: variables de entorno, migraciones, y que la **Redirect URI de Spotify coincida con tu dominio de producción**.

---

## Antes de nada — checklist

- [ ] Genera secretos de producción nuevos (no reuses los de dev):
  ```bash
  openssl rand -base64 48   # JWT_SECRET
  openssl rand -base64 32   # TOKEN_ENC_KEY
  ```
- [ ] En el [Spotify dashboard](https://developer.spotify.com/dashboard) añade la Redirect URI de prod:
  `https://api.TU-DOMINIO.com/api/auth/spotify/callback`
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
- Variable de entorno: `NEXT_PUBLIC_API_URL=https://api.TU-DOMINIO.com/api`.
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
git clone <repo> sonora && cd sonora
cp .env.example .env        # edita con dominios/secretos de PROD
# Importante: NEXT_PUBLIC_API_URL=https://TU-DOMINIO.com/api

docker compose --profile app up -d --build
```

Esto levanta **postgres, redis, backend, frontend y ml-service**. Las migraciones corren solas al arrancar el backend.

### Reverse proxy + SSL (Nginx)
Pon Nginx delante enrutando:
- `TU-DOMINIO.com`        → frontend `:3000`
- `api.TU-DOMINIO.com`    → backend `:4000`

Con [Certbot](https://certbot.eff.org/) para SSL. Asegúrate de que `NEXT_PUBLIC_API_URL` se pasó como **build arg** (el compose ya lo hace desde `.env`).

### Backups
```bash
# Volcado diario de Postgres (cron)
docker compose exec -T postgres pg_dump -U sonora sonora | gzip > backup-$(date +%F).sql.gz
```

---

## Operación

- **Salud:** `GET /api/health` (incluye estado de BD) y la página `/dashboard/admin` (colas, syncs, tokens).
- **Jobs:** el sync de Spotify corre cada 30 min; el de Steam cada 6h (cron en el backend).
- **Logs:** `docker compose logs -f backend`.
- **Migrar tras un cambio de schema:** `npx prisma migrate deploy` (el contenedor lo hace al reiniciar).

---

## Lo que NO necesitas todavía
Kubernetes, multitenancy, pagos, CDN propia. Para un MVP de un usuario (o pocos), Railway + Supabase + Vercel sobra. Escala cuando el problema sea real, no antes.

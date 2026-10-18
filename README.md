# Steatify 🎧🎮

Dominio del proyecto: **https://steatify.lat**. Repositorio activo: [mathiasmora2232/steatify](https://github.com/mathiasmora2232/steatify).

Steatify continúa la última versión de Sonora (`72c4096`), cuyo repositorio se conserva como archivo histórico. Se mantiene el historial Git completo y, por compatibilidad, los nombres internos de base de datos, migraciones y almacenamiento de Sonora. La configuración prevista para producción está en `.env.production.example`; DNS, HTTPS y OAuth requieren configurar el entorno de publicación.

**Tu diario digital de entretenimiento.** Un *Spotify Wrapped permanente* + *Google Analytics de música* + estadísticas de gaming — todo en una sola plataforma, construida sobre tu historial real de **Spotify** y **Steam**.

No es un clon de stats.fm: el diferencial está en la **analítica longitudinal** (eras, comparadores, contribution graph), la **personalidad musical** (ADN, tendencias, cementerio) y el cruce **música + gaming + IA**.

> Estado: **producto en beta local**, núcleo estabilizado con tests. Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para las decisiones técnicas y [DEPLOY.md](DEPLOY.md) para publicar.

---

## ✨ Funcionalidades

### 🎵 Música (Spotify)
- **Autenticación** OAuth con tokens cifrados (AES-256-GCM) y refresh rotativo.
- **ETL incremental** — sincroniza tu *recently-played* cada 30 min, deduplicado, con **minutos reales** calculados por los huecos entre reproducciones (no asume que cada canción sonó completa).
- **Importador** del *Extended Streaming History* (años de datos de una vez).
- **Now Playing** en vivo + feed reciente con timestamps.
- **Analítica** con ventanas flexibles: **hoy / día específico / rango de fechas** / presets — todo en tu **hora local**.
  - Rankings de canciones, artistas, álbumes y géneros.
  - Reloj de escucha (por hora) y por día de la semana.
  - Comparador temporal (este mes/año vs el anterior).
  - Contribution graph estilo GitHub (intensidad + mood).
- **Eras musicales** — detecta etapas por artista dominante + comportamiento (nocturna, exploradora, en bucle…) y las nombra automáticamente.
- **Logros** data-driven (reglas como JSON), con logros de inicio alcanzables.
- **Insights con IA** ("Tu semana musical") — opcionalmente con Claude, con fallback de plantilla.
- **Predictor de obsesiones** — canciones candidatas a entrar a tu top.

### 🧬 Personalidad musical (lo que stats.fm no tiene)
- **ADN Musical** (`/dna`) — un perfil generado: % Explorador / Maratonista / Nocturno / Fiel / Nostálgico, con descripción de personalidad y patrones (% noche, multiplicador de repetición, antigüedad media, lealtad…).
- **Tendencias** (`/trends`):
  - **Mercado de artistas** — tu consumo como bolsa (▲▼ por artista).
  - **Cementerio musical** — canciones que amabas y abandonaste.

### 🎮 Gaming (Steam)
- Vinculación por SteamID / vanity / URL · sync manual y automático (cada 6h).
- Stats: horas, juegos, jugados/sin jugar, promedio por juego.
- **Biblioteca completa** con búsqueda y orden.
- **Backlog** — juegos nunca abiertos, apenas tocados, % completado.

### 🏠 Plataforma
- **Home unificado** música + gaming.
- **Dashboard de salud** (`/admin`) — estado de DB/Redis, colas BullMQ, últimas syncs, validez de tokens, totales.
- Todo **tz-aware** (zona horaria del usuario).

---

## 🧱 Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 15 · TypeScript · Tailwind v4 · Framer Motion · Recharts · SWR |
| Backend | NestJS 11 · Prisma · PostgreSQL · Redis · BullMQ |
| ML/IA | FastAPI (Python 3.12) · Anthropic SDK (`claude-opus-4-8`, opcional) |
| Infra | Docker Compose (Postgres + Redis) |
| Tests | Node test runner nativo (`node:test`) |

```
frontend/   UI (Next.js)
backend/    API + ETL + jobs + analítica (NestJS) ← dueño único de la BD
ml-service/ IA/ML (FastAPI, stateless)
docker/     Dockerfiles
docs/       Arquitectura
```

---

## 🚀 Puesta en marcha (local)

### Prerrequisitos
Node ≥ 20 · npm ≥ 10 · Docker · (Python 3.12 solo para el ml-service) · una app en el [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) · opcional: [Steam Web API key](https://steamcommunity.com/dev/apikey).

```bash
# 1. Variables de entorno
cp .env.example .env
openssl rand -base64 48   # → JWT_SECRET
openssl rand -base64 32   # → TOKEN_ENC_KEY
# Rellena SPOTIFY_CLIENT_ID/SECRET y (opcional) STEAM_API_KEY, ANTHROPIC_API_KEY.
# Redirect URI en Spotify (exacta):  http://127.0.0.1:4000/api/auth/spotify/callback

# 2. Infraestructura
npm run infra:up            # Postgres + Redis

# 3. Backend
npm install
npm run db:generate && npm run db:migrate && npm run db:seed
npm run dev:backend         # http://127.0.0.1:4000

# 4. Frontend
npm run dev:frontend        # http://127.0.0.1:3000

# 5. ml-service (opcional)
cd ml-service && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn app.main:app --port 8000
```

Abre **http://127.0.0.1:3000**, conecta Spotify, y opcionalmente vincula Steam en `/dashboard/steam`.

> ⚠️ Usa `127.0.0.1` (no `localhost`): Spotify ya no acepta `localhost` en redirect URIs.

### Todo en Docker
```bash
docker compose --profile app up --build
```

---

## 🧪 Tests

```bash
cd backend && npm test
```

Cubre la lógica que puede corromper datos: **zona horaria / ventanas de fecha**, **cifrado de tokens**, **mood**, **parser del Extended History** y **parser de SteamID** (26 tests, runner nativo de Node — sin dependencias extra).

---

## 📡 Endpoints principales

| Área | Rutas |
|------|-------|
| Auth | `/api/auth/spotify/login · /callback · /refresh · /logout` |
| Stats | `/api/stats/{summary,top,series,clock,weekdays,recent,compare,contributions}` (preset/día/rango) |
| Música | `/api/eras · /achievements · /insights · /predictions · /dna · /trends · /ingestion/{sync,now-playing}` |
| Steam | `/api/steam/{link,sync,stats,library,backlog,games}` |
| Import | `/api/import/spotify · /import/status/:jobId` |
| Salud | `/api/admin/overview · /health` |

---

## 🔐 Notas de seguridad
- Tokens de Spotify **cifrados en reposo**; sesiones con refresh rotativo (solo se guarda el hash).
- Cookies `httpOnly` · CSRF en OAuth (`state`) · CORS restringido · validación de entorno con Zod al arrancar.
- Las API keys (Steam, Anthropic) viven **solo en el backend** (`.env`), nunca en el cliente.

---

## ⚠️ Limitación conocida (Spotify)
Las apps nuevas de Spotify reciben acceso **reducido a metadatos**: la API ya **no devuelve géneros ni audio-features** (deprecados en 2024). Por eso "top géneros" y el "mood" real quedan vacíos. Todo lo demás funciona; eras, ADN e insights usan **artistas y comportamiento** en su lugar. Alternativa futura: enriquecer géneros vía Last.fm/MusicBrainz.

---

## 🗺️ Roadmap
- **1.0** ✅ stats · Spotify · Steam · eras · logros · import · tests · salud
- **2.0** 🚧 ADN ✅ · Artist Stock ✅ · Cementerio ✅ · Máquina del tiempo · Steam+Música cruzado
- **3.0** 🔮 Chat IA con tus datos · ML real · score global

## 📄 Licencia
Proyecto personal. Sin licencia pública por ahora.

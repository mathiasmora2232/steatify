# Sonora — Decisiones de arquitectura

Documento vivo. Explica el *por qué* detrás de las decisiones técnicas
importantes. El *qué* y el *cómo* están en el código.

## Visión

> "Spotify Wrapped permanente + Google Analytics de música + diario musical
> inteligente."

No es un clon de stats.fm: el diferencial está en **analítica longitudinal**
(eras, comparadores, contribution graph) e **inteligencia** (insights y
predicciones). La base de datos y el ETL se diseñan desde el día 1 para soportar
esas capas sin reescribir.

## Topología

Monorepo con tres servicios desplegables y una capa de infraestructura:

```
frontend/    Next.js (App Router) — UI
backend/     NestJS — API REST, auth, ETL, jobs, analítica  ← núcleo
ml-service/  FastAPI — texto/predicciones (stateless)
docker/      Dockerfiles + compose para Postgres y Redis
```

**Por qué NestJS como núcleo y FastAPI aparte:** el grueso del producto es
CRUD/agregación/orquestación tipado → NestJS encaja (DI, módulos, guards). La
IA/ML vive mejor en Python. Separarlos evita meter Python en el camino crítico
de cada request y permite escalar la inferencia por separado. El backend es el
**único dueño de la base de datos**; el ml-service recibe features ya agregadas
y devuelve texto/scores. Así no hay dos servicios escribiendo las mismas tablas.

**Monorepo con npm workspaces:** un solo `git`, tipos y contratos compartibles,
DX simple. Si crece, se migra a Turborepo/pnpm sin cambiar la estructura.

## Datos: el corazón del sistema

### Catálogo global vs. historial por usuario

Artistas, álbumes, tracks y géneros son un **catálogo global compartido**: una
canción se guarda una sola vez y todos los usuarios la referencian. Esto mantiene
`listening_history` —la tabla caliente— **estrecha** (casi solo claves foráneas),
que es lo que permite escalar a millones de filas.

### `listening_history` — la tabla caliente

- Append-only. Deduplicada por índice único `(userId, playedAt)`: un usuario no
  puede iniciar la misma reproducción dos veces en el mismo instante, así el ETL
  es **idempotente** (re-ejecutar un sync no duplica nada → `createMany({ skipDuplicates })`).
- `artistId` (artista principal) está **desnormalizado** en la fila para que los
  rankings por artista no necesiten un join.
- Índices alineados a los accesos reales del dashboard: feed reciente
  `(userId, playedAt desc)`, conteo por track `(userId, trackId)`, por artista
  `(userId, artistId)`.
- **Particionado:** en producción se convierte a `PARTITION BY RANGE (playedAt)`
  mensual (ver nota al pie de `schema.prisma`). Un job mensual crea la partición
  del mes siguiente; las queries con filtro temporal hacen *partition pruning*.

### Agregados precomputados

`daily_stats` y `monthly_stats` responden "top X de este mes" sin escanear el
historial crudo. Se reconstruyen incrementalmente tras cada sync (Fase 2). Los
top-lists se guardan como JSON denormalizado para servir tarjetas tipo Wrapped al
instante. El **contribution graph** se alimenta de `daily_stats` (minutos + mood
por día).

### Audio features = base de "mood", eras y ML

`track_features` (valence, energy, tempo…) es lo que convierte datos crudos en
*mood*. Se rellena de forma perezosa y por lotes solo para tracks nuevos. Si
faltan, las features que dependen de ello degradan con gracia.

## La restricción clave de Spotify (y cómo la resolvemos)

El endpoint `recently-played` devuelve **solo las últimas ~50 reproducciones /
~24h** y no permite backfill histórico. Implicaciones de diseño:

1. **Polling frecuente** (cada 30 min por defecto) es la única forma de construir
   un historial completo. De ahí el scheduler + cola.
2. El cursor incremental es el `playedAt` más reciente que ya tenemos
   (`after` en la API), así solo traemos lo nuevo.
3. Para historial profundo (años), el esquema ya contempla
   `PlaySource.IMPORT_EXTENDED`: el usuario sube su *Extended Streaming History*
   (export GDPR) y se ingiere por la misma tabla con dedupe por `(userId, playedAt)`.

## Jobs y colas

BullMQ sobre Redis. El `SyncScheduler` (cron cada 30 min) encola un job por
usuario con `syncEnabled`; el `SyncProcessor` los consume con **concurrencia
limitada (5)** para respetar el rate limit de Spotify globalmente. Los `jobId`
llevan un *bucket* temporal para colapsar duplicados si dos ticks se solapan.
Reintentos con backoff exponencial.

## Seguridad

- **Tokens de Spotify cifrados en reposo** (AES-256-GCM con `TOKEN_ENC_KEY`).
  Nunca en texto plano. Rotar la clave invalida tokens → los usuarios re-autentican.
- **Sesiones con refresh rotativo:** el access token es un JWT corto (15 min); el
  refresh es un token opaco del que solo guardamos el **hash** (`Session`). En
  cada refresh se revoca el anterior y se emite uno nuevo (rotación). Una fuga de
  BD no otorga sesiones.
- Cookies `httpOnly` + `sameSite=lax` (+ `secure` en prod). El frontend nunca ve
  los tokens en JS.
- **CSRF en OAuth:** parámetro `state` aleatorio validado contra cookie.
- Validación de entorno con Zod al arrancar: el server no levanta con config inválida.
- `helmet`, CORS restringido al frontend, throttling global.

## Frontend

Next.js App Router. Estética dark premium (Linear/Vercel): superficies casi
negras, un acento (verde Spotify) + violeta para charts/eras, radios generosos,
bordes suaves. Tokens de diseño centralizados en `globals.css` (Tailwind v4
`@theme`). Animaciones con Framer Motion, charts con Recharts. La capa `lib/api`
reintenta una vez vía `/auth/refresh` ante un 401, transparentemente.

## Capa de IA — contrato estable desde Fase 1

Las tablas `ai_insights` y `obsession_candidates` y los endpoints del ml-service
existen ya con **placeholders heurísticos**. En Fase 4 se reemplaza la
implementación (LLM / modelo) detrás del **mismo contrato HTTP**, sin tocar el
backend. Los insights se generan *grounded* en agregados (evidencia verificable),
no en texto libre.

## Roadmap por fases

- **Fase 1 (este commit):** estructura, BD, auth Spotify, ETL incremental. ✅
- **Fase 2:** endpoints de analítica (`/stats/daily|top|range`), jobs de
  agregación, dashboard real con filtros 24h/semana/mes/año/histórico.
- **Fase 3:** detector de eras (clustering temporal sobre features+géneros),
  motor de logros (evalúa `rule` JSON contra métricas), comparador temporal.
- **Fase 4:** insights con LLM, predictor de obsesiones con modelo real.

## Deuda/atajos conscientes del MVP

- Los upserts del catálogo son por-entidad (claros pero con N queries). Para
  ingesta masiva se baten en lotes; anotado en `catalog.service.ts`.
- Las tarjetas "Hoy" del dashboard muestran placeholders hasta los endpoints de Fase 2.
- Sin tests aún; el siguiente paso natural es testear `IngestionService` (dedupe)
  y el flujo de refresh de tokens.

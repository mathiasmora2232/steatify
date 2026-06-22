# 🎵 Sonora — Documento Maestro

> **"Tu universo. Tu historia. Tus datos."**
> Spotify Wrapped permanente + Steam Replay + diario automático = tu **identidad digital generada por tus datos**.
> En producción: **[codecanvas3d.com](https://codecanvas3d.com)** · Última actualización del doc: 21 jun 2026

Este archivo es la **fuente de verdad** de qué tiene Sonora, cómo está implementado, todas las pantallas, lo pendiente y recomendaciones. Úsalo para consolidar y decidir qué agregar.

---

## 1. Qué es Sonora

Una app que conecta **Spotify** (música) y **Steam** (gaming) y convierte tu actividad en estadísticas, eras, arquetipos, logros, un "Wrapped" permanente y un perfil público tipo carta de identidad. Además tiene una capa **social** (seguir, comparar, feed automático).

**Pilares:**
1. **Datos vivos** — qué suena ahora, qué juegas, tu día.
2. **Identidad** — ADN musical, arquetipos, nivel/rareza, pasaporte.
3. **Narrativa** — eras, Wrapped, insights (con IA).
4. **Social** — perfiles públicos, comparación de compatibilidad, feed.

---

## 2. Stack y Arquitectura

| Capa | Tecnología |
|---|---|
| **Frontend** | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Framer Motion · Recharts · SWR |
| **Backend** | NestJS 11 · Prisma 6 · BullMQ (colas) · @nestjs/throttler · helmet |
| **Base de datos** | PostgreSQL (Supabase) — 27 modelos, 17 migraciones |
| **Cache/Colas** | Redis (Railway) |
| **IA** | LLM para narrativas (insights/eras/wrapped) con *fallback* determinista si no hay API key |
| **Auth** | OAuth2 Spotify + cuenta propia (email+contraseña) + modo invitado · JWT (access 15 min / refresh 30 días) |

**Despliegue (single-origin):**
```
Usuario → codecanvas3d.com (Vercel, frontend)
             │  el front hace de proxy /api/* →
             ▼
          Railway (backend NestJS, Docker) → Supabase (Postgres) + Redis
```
- **Vercel**: frontend. Deploy por push a `main` (a veces se bloquea por el plan Hobby → se re-dispara por API).
- **Railway**: backend. Auto-deploy por push; corre migraciones de Prisma en el arranque.
- **Supabase**: Postgres gestionado (toda la data histórica migrada, ~78k registros de escucha).
- **Dominio**: Spaceship (DNS → Vercel).

---

## 3. Mapa de Pantallas (30 rutas)

### Públicas / Auth
| Ruta | Qué tiene |
|---|---|
| `/` | Landing con logo, tagline, CTA (crear cuenta / Spotify / invitado), enlaces legales |
| `/login` | Login (email o usuario + contraseña), Spotify, invitado, enlaces legales |
| `/register` | Registro con **checkbox obligatorio** de Términos + Privacidad |
| `/privacy` | Política de Privacidad v2 (12 secciones, incl. uso de IA) |
| `/terms` | Términos de Servicio v2 (17 secciones, descargo IA, limitación de responsabilidad) |
| `/u/[username]` | **Perfil público 2.0** (carta de identidad, standalone para compartir) |
| `/u/[username]/vs/[other]` | **Compare Spaces** — compatibilidad entre dos usuarios |

### Dashboard (requiere sesión)
| Ruta | Qué tiene |
|---|---|
| `/dashboard` | **Resumen**: hero (qué suena/juegas, tu era), ADN, destacados, mini-stats, rankings |
| `/dashboard/profile` | **Mi Perfil 2.0** dentro del layout (hero data-color, pasaporte, vitrinas, universo, colecciones, timeline) |
| `/dashboard/wrapped` | **Sonora Wrapped** — resumen por periodo (semana/mes/temporada/año), arquetipos, mezcla, eventos, premios |
| `/dashboard/dna` | **ADN Musical** — arquetipos y rasgos |
| `/dashboard/rankings` | Top canciones / artistas / álbumes / géneros (top 10) |
| `/dashboard/eras` | **Eras** musicales (cada mes = un capítulo con nombre + narrativa IA) |
| `/dashboard/versus` | **Tú vs Tú** — comparación de periodos propios |
| `/dashboard/social` | **Social** — a quién sigues + feed automático de su actividad |
| `/dashboard/trends` | Tendencias (subiendo/bajando) |
| `/dashboard/graveyard` | **Cementerio** musical (canciones que amaste y abandonaste) |
| `/dashboard/activity` | Actividad / calendario de escucha |
| `/dashboard/achievements` | **Logros** desbloqueables |
| `/dashboard/insights` | **Insights IA** — recaps semanales generados |
| `/dashboard/import` | Importar historial extendido de Spotify (JSON) |
| `/dashboard/settings` | **Ajustes** (ver abajo) |
| `/dashboard/admin` | Estado del sistema (debug/salud) |
| `/dashboard/song/[trackId]` | Ficha de una canción (tus stats sobre ella) |
| `/dashboard/artist/[artistId]` | Ficha de un artista |
| `/dashboard/album/[albumId]` | Ficha de un álbum |

### Steam
| Ruta | Qué tiene |
|---|---|
| `/dashboard/steam` | Hub gaming: clase de jugador, stats, **recomendaciones rotativas** (Para empezar / Para retomar), **Joya oculta**, economía de biblioteca (estilo SteamDB), cementerio gamer, mercado (subiendo/abandonados) |
| `/dashboard/steam/library` | Biblioteca completa (filtros: jugados/sin jugar/horas/abandonados) |
| `/dashboard/steam/activity` | Actividad de gaming |
| `/dashboard/steam/game/[appId]` | Ficha de un juego |
| `/dashboard/steam/wrapped` | Steam Wrapped |

### Ajustes (`/dashboard/settings`)
Perfil (avatar/banner/bio + **enlace público con copiar**) · Conexiones (Spotify/Steam) · **Seguridad** (contraseña) · **Sesiones y dispositivos** (cerrar sesión, multi-dispositivo) · Privacidad (público/música/gaming) · **Apariencia** (7 temas de acento) · Preferencias (zona horaria) · IA (auto-insights) · Datos (borrar cuenta).

---

## 4. Sistemas Backend (módulos)

| Módulo | Responsabilidad |
|---|---|
| `auth` | OAuth Spotify, cuenta propia, invitado, JWT, **sesiones (listar/revocar/cerrar otras)** |
| `spotify` | Web API de Spotify (perfil, recently-played, top, now-playing) |
| `ingestion` | Sincronización programada (cron) del historial — **solo usuarios activos** |
| `stats` | Estadísticas base (minutos, plays, rankings) |
| `dna` | Arquetipos / ADN musical |
| `eras` | Detección de eras mensuales + narrativa |
| `wrapped` | Generación del Wrapped por periodo |
| `charts` | Récords, hall of fame |
| `trends` | Subiendo/bajando, cementerio |
| `achievements` | Logros |
| `insights` | Recaps IA semanales |
| `events` | **MusicEvents** auto (obsesión, regreso, récord, aniversario) → alimentan el feed social |
| `predictions` / `ml` / `brain` | Predicciones / candidatos de obsesión / lógica derivada |
| `steam` | Biblioteca, stats, economía, momentum, snapshots, recomendaciones |
| `social` | **Follows** + feed de actividad |
| `compare` | **Vibe Match** entre dos usuarios |
| `profile` | Perfil público (música+gaming+ADN+colecciones+timeline) |
| `connections` | Conectar/desconectar Spotify y Steam |
| `users` | Perfil, credenciales, borrar cuenta |
| `import` | Importación de historial extendido (cola BullMQ) |
| `catalog` / `artists` / `albums` / `songs` / `search` | Fichas y búsqueda global (⌘K) |
| `cache` | Redis (caché + tracking de usuarios activos) |
| `admin` / `health` | Salud y debug |

---

## 5. Modelo de Datos (Prisma — 27 modelos)

**Identidad/Auth:** `User`, `Follow`, `Session`, `SpotifyAccount`, `SteamAccount`
**Música:** `Artist`, `Genre`, `ArtistGenre`, `Album`, `AlbumArtist`, `Track`, `TrackArtist`, `TrackFeatures`, `ListeningHistory`, `DailyStat`, `MonthlyStat`, `MusicEra`, `MusicEvent`, `ObsessionCandidate`
**Gaming:** `SteamGame`, `UserGame`, `SteamSnapshot`, `SteamGameSnapshot`, `SteamSyncLog`
**Logros/IA:** `AchievementDefinition`, `UserAchievement`, `AiInsight`

---

## 6. Seguridad

| Control | Estado |
|---|---|
| Headers (HSTS/CSP/X-Frame) | ✅ helmet activo |
| CORS | ✅ restringido al dominio + credentials |
| Secrets | ✅ `.env`/`railway-env.txt` gitignored, `client_secret` solo backend |
| Tokens Spotify/Steam | ✅ cifrados (AES-256-GCM) |
| Contraseñas | ✅ hash scrypt |
| Inyección SQL | ✅ Prisma parametrizado |
| **Rate limiting** | ✅ **Activo** (global 300/min por IP real; login/register 15/min; guest 10/min) |
| **IDOR** | ✅ Endpoints filtran por `userId` del token; import/status valida dueño |
| **Sesiones** | ✅ refresh sin rotación (sin race de logout), revocables, limpieza de muertas |
| Scopes Spotify | ✅ mínimos (sin `playback-state`) |

**Caveat:** el rate limiting usa `X-Forwarded-For[0]` (separa usuarios bien, pero un atacante podría falsificar el header). Suficiente para indie; reforzable con rate-limiter en el edge (Cloudflare/Vercel).

---

## 7. IA

Narrativas (insights semanales, descripciones de eras, textos de Wrapped) generadas por **LLM** cuando hay API key configurada; si no, **fallback determinista** (plantillas). Solo se envían datos agregados (nombres + conteos), nunca tokens ni contraseñas. Declarado en Privacidad/Términos.

---

## 8. Cómo está hecho el Perfil 2.0 (referencia)

`<ProfileBody>` (componente compartido) renderiza: **Hero** (fondo del color derivado de tu artista #1) → **Sonora Passport** (clase, barras de rasgos, rareza, miembro desde) → **Vitrinas** (canción/juego/artista) → **Mi Universo** (min, artistas, horas, juegos, % explorado) → **Colecciones** (obsesiones/mundos/leyendas/cementerio, conteos curados) → **Línea temporal** (eras). Usado por `/u/[username]` (standalone) y `/dashboard/profile` (in-app).

---

## 9. Implementado recientemente (changelog de esta etapa)

- ✅ Login Spotify arreglado + producción desplegada + data migrada a Supabase
- ✅ Wrapped rediseñado (arquetipos dinámicos, periodos)
- ✅ App responsive (nav móvil)
- ✅ Perfil 2.0 (carta de identidad) + integración en el layout
- ✅ Social: follows + feed automático + Compare Spaces (Vibe Match)
- ✅ Cuenta: contraseña, **cerrar sesión**, **sesiones multi-dispositivo**
- ✅ Fix de raíz: refresh sin rotación (causaba 100+ sesiones colgadas)
- ✅ Legales v2 (Privacidad + Términos + consentimiento en registro)
- ✅ Logo + favicon (S degradado: música + gaming)
- ✅ QoL: 7 temas de acento, copiar enlace, 404 + error boundary branded
- ✅ Seguridad: rate limiting activado + IDOR cerrado
- ✅ Steam: recomendaciones rotativas (semanal + "Ver otras"), +2 juegos, "Joya oculta", cementerio rotativo
- ✅ Dashboard: arreglado el espacio del hero

---

## 10. Pendientes / Gaps conocidos

| Tema | Detalle |
|---|---|
| **Quota de Spotify** | App en modo desarrollo. Falta **pedir extended quota** (formulario con privacy/terms URLs + demo). Mientras: solo usuarios agregados manualmente pueden entrar con Spotify. |
| **Reroll no persistente** | El "Ver otras" de Steam no recuerda tu elección entre visitas (la rotación semanal sí es automática). |
| **Colecciones no clickeables** | En el perfil, las colecciones muestran conteo pero no abren detalle. |
| **Tema de perfil por logros** | La personalización de tema es global por dispositivo; falta el "tema desbloqueado por logros" del roadmap. |
| **Vitrinas no editables** | El usuario no elige qué presumir; se calcula automático. |
| **Sin toasts globales** | Feedback de acciones es inline; falta un sistema de notificaciones unificado. |
| **Fases sociales 5-6** | Faltan **salas/grupos** y **Wrapped social** (fin de año con un amigo). |
| **Ley aplicable** | Términos dicen Ecuador — confirmar jurisdicción real del estudio. |
| **Rate limiting** | Funcional pero basado en XFF (reforzable en el edge). |

---

## 11. Recomendaciones (mi criterio, priorizadas)

### 🔴 Alta prioridad (desbloquea crecimiento)
1. **Pedir la extended quota de Spotify** — sin esto, nadie más puede entrar con Spotify. Es el cuello de botella #1. Ya tienes todo lo necesario (legales, demo, scopes mínimos).
2. **Onboarding / estados de "conecta tu cuenta"** — cuando falta Spotify/Steam, guiar con CTAs claros (hoy puede sentirse vacío).
3. **Toasts globales** — feedback consistente al guardar/seguir/copiar. Mejora la sensación de calidad en toda la app.

### 🟡 Media (profundidad y enganche)
4. **Colecciones clickeables** en el perfil — abrir la lista (las 605 del cementerio, obsesiones, etc.). Convierte números en exploración.
5. **Fase 4 del social: notificaciones** — "X empezó a seguirte", "tu amigo entró en su era Bad Bunny". Reusa MusicEvents.
6. **Vitrinas editables** — dejar que el usuario elija qué presumir (muy "carta Pokémon").
7. **Comparaciones más ricas** — "tu mes más parecido al de tu amigo", canción compartida.

### 🟢 Baja (pulido / nice-to-have)
8. **Reroll persistente** (recordar por dispositivo).
9. **Tema de perfil desbloqueable por logros** (gamificación de la personalización).
10. **Salas/grupos** (Fase 5) y **Wrapped social** (Fase 6) — alto esfuerzo, hazlo cuando haya usuarios.
11. **Export de datos** (portabilidad) — bueno para confianza y para los términos.

### 💡 Ideas nuevas (para evaluar)
- **Notificaciones por email** (resumen semanal) — retención.
- **Modo "año en curso"** — un Wrapped que se va llenando en vivo.
- **Embeds/OG image dinámica** del perfil — al compartir el link, que se vea una tarjeta bonita (hoy es genérica).
- **Logros sociales** — "primer amigo", "10 seguidores", "100% compatible con alguien".
- **Más fuentes** — Last.fm, PSN/Xbox, Letterboxd (expandir "universo").

---

*Generado por análisis del código real (no de memoria). Para detalles de implementación, cada sistema vive en `backend/src/<módulo>` y cada pantalla en `frontend/src/app/...`.*

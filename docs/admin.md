Sí. Si Sonora ya va a tener usuarios reales, necesitas **Super Admin**. No para meterte en datos privados por morbo, sino para **operar, proteger y mantener el producto**.

## Qué administraría el Super Admin

### 1. Usuarios

Ver:

```txt
usuarios totales
usuarios activos
usuarios nuevos
último login
cuentas conectadas
estado de cuenta
```

Acciones:

```txt
suspender usuario
eliminar cuenta
forzar logout
revocar sesiones
ver errores de sync
```

---

### 2. Integraciones

Panel para Spotify / Steam:

```txt
usuarios con Spotify conectado
usuarios con Steam conectado
última sincronización
sync fallidas
tokens expirados
errores por usuario
cola de jobs
```

Acciones:

```txt
forzar sync de usuario
pausar sync
reintentar sync fallida
desconectar integración si hay abuso
```

---

### 3. Métricas del producto

```txt
DAU usuarios activos diarios
WAU usuarios activos semanales
MAU usuarios activos mensuales

usuarios registrados
usuarios que conectaron Spotify
usuarios que conectaron Steam
usuarios que completaron onboarding
usuarios que vuelven al día siguiente
```

Lo importante:

```txt
retención día 1
retención día 7
retención día 30
```

Ahí sabes si Sonora engancha o solo impresiona una vez.

---

### 4. Salud del sistema

```txt
API status
DB status
Redis status
colas BullMQ
jobs pendientes
jobs fallidos
tiempo promedio de respuesta
errores 500
uso de memoria
uso CPU
```

Esto te salva cuando prod se pone modo telenovela.

---

### 5. IA y costos

Muy importante.

```txt
insights generados hoy
tokens usados
costo estimado
usuarios que más generan IA
fallos IA
fallback usado
rate limit alcanzado
```

Acciones:

```txt
desactivar IA globalmente
limitar IA por usuario
limpiar insights duplicados
regenerar insight
```

---

### 6. Moderación social

Como tienes perfiles públicos, follows y feed:

```txt
reportes
usuarios bloqueados
perfiles públicos
nombres ofensivos
abuso de compartir
```

Acciones:

```txt
ocultar perfil
suspender usuario
cambiar username si viola reglas
eliminar contenido público generado
```

---

### 7. Configuración global

Un panel tipo feature flags:

```txt
activar/desactivar registro
activar modo beta
activar social
activar IA
activar Steam
activar Wrapped
activar mantenimiento
```

También:

```txt
mensaje global
banner de mantenimiento
límite de usuarios beta
```

---

## Roles recomendados

No solo super admin.

```txt
USER
ADMIN
SUPER_ADMIN
```

Más adelante:

```txt
MODERATOR
SUPPORT
```

Para ahora:

```ts
enum Role {
  USER
  ADMIN
  SUPER_ADMIN
}
```

## Tabla básica

```prisma
enum Role {
  USER
  ADMIN
  SUPER_ADMIN
}

model User {
  id    String @id @default(uuid())
  email String @unique
  role  Role   @default(USER)
}
```

## Rutas admin

```txt
/dashboard/admin
/dashboard/admin/users
/dashboard/admin/jobs
/dashboard/admin/system
/dashboard/admin/integrations
/dashboard/admin/ai
/dashboard/admin/flags
```

## Métricas que sí o sí pondría

```txt
Usuarios:
- total
- nuevos hoy
- activos hoy
- activos 7 días
- activos 30 días

Conexiones:
- Spotify conectados
- Steam conectados
- ambos conectados

Retención:
- usuarios que vuelven día siguiente
- usuarios activos después de 7 días

Sistema:
- jobs fallidos
- syncs exitosas
- errores 500
- latencia promedio

IA:
- insights generados
- costo estimado
- fallos
```

## Regla de privacidad

El admin **no debería ver tokens ni contraseñas ni datos sensibles crudos**.

Puede ver:

```txt
estado
conteos
errores
última sync
```

No:

```txt
access_token
refresh_token
password_hash
```

Para mí el Super Admin decide:

```txt
quién entra
qué features están activas
qué usuarios dan problema
qué sync falló
qué cuesta dinero
qué parte del sistema se está cayendo
```

Eso es operar producto, no stalkear usuarios. Ahí está la línea sana.

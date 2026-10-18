#!/usr/bin/env bash
set -Eeuo pipefail

# Migra datos desde Supabase hacia la base Steatify del Postgres del VPS.
# Hace un pg_dump custom del origen, guarda respaldo local y restaura sobre la DB destino.
# No imprime URLs ni passwords. Requiere SUPABASE_DATABASE_URL en .env o entorno.

ENV_FILE="${STEATIFY_ENV_FILE:-${SONORA_ENV_FILE:-.env}}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

if [ -z "${SUPABASE_DATABASE_URL:-}" ]; then
  echo "ERROR: falta SUPABASE_DATABASE_URL" >&2
  exit 1
fi
if [ -z "${DB_PASSWORD:-}" ]; then
  echo "ERROR: falta DB_PASSWORD del Postgres principal" >&2
  exit 1
fi

DB_CONTAINER="${SHOPDB_POSTGRES_CONTAINER:-shopdb-postgres}"
ADMIN_USER="${SHOPDB_ADMIN_USER:-shopdb}"
STEATIFY_DB="${POSTGRES_DB:-steatify}"
BACKUP_DIR="${STEATIFY_BACKUP_DIR:-${SONORA_BACKUP_DIR:-/root/steatify/backups/supabase}}"
KEEP_BACKUPS="${STEATIFY_KEEP_BACKUPS:-${SONORA_KEEP_BACKUPS:-5}}"
TS="$(date -u '+%Y%m%dT%H%M%SZ')"
DUMP="$BACKUP_DIR/steatify-supabase-$TS.dump"
MANIFEST="$DUMP.json"
SHA="$DUMP.sha256"

mkdir -p "$BACKUP_DIR"

echo "dumping_supabase_to=$DUMP"
docker run --rm -e SUPABASE_DATABASE_URL postgres:16-alpine sh -lc 'pg_dump "$SUPABASE_DATABASE_URL" -Fc --no-owner --no-acl' > "$DUMP"

if [ ! -s "$DUMP" ]; then
  echo "ERROR: dump vacio" >&2
  exit 1
fi

sha256sum "$DUMP" > "$SHA"
BYTES="$(wc -c < "$DUMP" | tr -d ' ')"
cat > "$MANIFEST" <<JSON
{
  "created_at_utc": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "source": "supabase",
  "target_database": "$STEATIFY_DB",
  "bytes": $BYTES,
  "file": "$(basename "$DUMP")",
  "sha256_file": "$(basename "$SHA")"
}
JSON

echo "restoring_to=$STEATIFY_DB"
docker exec -e PGPASSWORD="$DB_PASSWORD" -i "$DB_CONTAINER" pg_restore -U "$ADMIN_USER" -d "$STEATIFY_DB" --clean --if-exists --no-owner --no-acl < "$DUMP"

echo "retention_keep=$KEEP_BACKUPS"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'steatify-supabase-*.dump' -printf '%T@ %p\n' \
  | sort -nr \
  | awk -v keep="$KEEP_BACKUPS" 'NR>keep {print $2}' \
  | while IFS= read -r old; do
      echo "removing_old=$(basename "$old")"
      rm -f "$old" "$old.sha256" "$old.json"
    done

echo "ok=steatify_migrated backup=$DUMP"

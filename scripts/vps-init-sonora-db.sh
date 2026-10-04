#!/usr/bin/env bash
set -Eeuo pipefail

# Crea/actualiza la base y rol de Sonora dentro del Postgres existente de SmartAhorra.
# Requiere correr en el VPS, desde la raiz del repo Sonora o con SONORA_ENV_FILE apuntando al .env real.
# No imprime passwords.

ENV_FILE="${SONORA_ENV_FILE:-.env}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

DB_CONTAINER="${SHOPDB_POSTGRES_CONTAINER:-shopdb-postgres}"
ADMIN_DB="${SHOPDB_ADMIN_DB:-postgres}"
ADMIN_USER="${SHOPDB_ADMIN_USER:-shopdb}"
SONORA_DB="${POSTGRES_DB:-sonora}"
SONORA_USER="${POSTGRES_USER:-sonora}"
SONORA_PASSWORD="${POSTGRES_PASSWORD:-${SONORA_DB_PASSWORD:-}}"

if [ -z "${DB_PASSWORD:-}" ]; then
  echo "ERROR: falta DB_PASSWORD del Postgres principal" >&2
  exit 1
fi
if [ -z "$SONORA_PASSWORD" ]; then
  echo "ERROR: falta POSTGRES_PASSWORD o SONORA_DB_PASSWORD para el rol sonora" >&2
  exit 1
fi

psql_admin() {
  docker exec \
    -e PGPASSWORD="$DB_PASSWORD" \
    -e SONORA_DB="$SONORA_DB" \
    -e SONORA_USER="$SONORA_USER" \
    -e SONORA_PASSWORD="$SONORA_PASSWORD" \
    -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -v SONORA_DB="$SONORA_DB" -v SONORA_USER="$SONORA_USER" -v SONORA_PASSWORD="$SONORA_PASSWORD" -U "$ADMIN_USER" -d "$ADMIN_DB" "$@"
}

role_exists="$(psql_admin -tA <<'SQL' || true
SELECT 1 FROM pg_roles WHERE rolname = :'SONORA_USER';
SQL
)"
if [ "$role_exists" = "1" ]; then
  echo "role_exists=$SONORA_USER"
else
  echo "creating_role=$SONORA_USER"
  psql_admin <<'SQL'
CREATE ROLE :"SONORA_USER" LOGIN PASSWORD :'SONORA_PASSWORD';
SQL
fi

psql_admin <<'SQL'
ALTER ROLE :"SONORA_USER" WITH LOGIN PASSWORD :'SONORA_PASSWORD';
SQL

db_exists="$(psql_admin -tA <<'SQL' || true
SELECT 1 FROM pg_database WHERE datname = :'SONORA_DB';
SQL
)"
if [ "$db_exists" = "1" ]; then
  echo "database_exists=$SONORA_DB"
else
  echo "creating_database=$SONORA_DB"
  psql_admin <<'SQL'
CREATE DATABASE :"SONORA_DB" OWNER :"SONORA_USER";
SQL
fi

docker exec \
  -e PGPASSWORD="$DB_PASSWORD" \
  -e SONORA_DB="$SONORA_DB" \
  -e SONORA_USER="$SONORA_USER" \
  -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -v SONORA_DB="$SONORA_DB" -v SONORA_USER="$SONORA_USER" -U "$ADMIN_USER" -d "$SONORA_DB" <<'SQL'
GRANT ALL PRIVILEGES ON DATABASE :"SONORA_DB" TO :"SONORA_USER";
GRANT ALL ON SCHEMA public TO :"SONORA_USER";
ALTER SCHEMA public OWNER TO :"SONORA_USER";
SQL

echo "ok=sonora_db_ready db=$SONORA_DB user=$SONORA_USER container=$DB_CONTAINER"

#!/usr/bin/env bash
set -Eeuo pipefail

# Crea/actualiza la base y rol de Steatify dentro del Postgres existente de SmartAhorra.
# Requiere correr en el VPS, desde la raiz del repo Steatify o con STEATIFY_ENV_FILE apuntando al .env real.
# No imprime passwords.

ENV_FILE="${STEATIFY_ENV_FILE:-${SONORA_ENV_FILE:-.env}}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

DB_CONTAINER="${SHOPDB_POSTGRES_CONTAINER:-shopdb-postgres}"
ADMIN_DB="${SHOPDB_ADMIN_DB:-postgres}"
ADMIN_USER="${SHOPDB_ADMIN_USER:-shopdb}"
STEATIFY_DB="${POSTGRES_DB:-steatify}"
STEATIFY_USER="${POSTGRES_USER:-steatify}"
STEATIFY_PASSWORD="${POSTGRES_PASSWORD:-${STEATIFY_DB_PASSWORD:-${SONORA_DB_PASSWORD:-}}}"

if [ -z "${DB_PASSWORD:-}" ]; then
  echo "ERROR: falta DB_PASSWORD del Postgres principal" >&2
  exit 1
fi
if [ -z "$STEATIFY_PASSWORD" ]; then
  echo "ERROR: falta POSTGRES_PASSWORD o STEATIFY_DB_PASSWORD para el rol steatify" >&2
  exit 1
fi

psql_admin() {
  docker exec \
    -e PGPASSWORD="$DB_PASSWORD" \
    -e STEATIFY_DB="$STEATIFY_DB" \
    -e STEATIFY_USER="$STEATIFY_USER" \
    -e STEATIFY_PASSWORD="$STEATIFY_PASSWORD" \
    -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -v STEATIFY_DB="$STEATIFY_DB" -v STEATIFY_USER="$STEATIFY_USER" -v STEATIFY_PASSWORD="$STEATIFY_PASSWORD" -U "$ADMIN_USER" -d "$ADMIN_DB" "$@"
}

role_exists="$(psql_admin -tA <<'SQL' || true
SELECT 1 FROM pg_roles WHERE rolname = :'STEATIFY_USER';
SQL
)"
if [ "$role_exists" = "1" ]; then
  echo "role_exists=$STEATIFY_USER"
else
  echo "creating_role=$STEATIFY_USER"
  psql_admin <<'SQL'
CREATE ROLE :"STEATIFY_USER" LOGIN PASSWORD :'STEATIFY_PASSWORD';
SQL
fi

psql_admin <<'SQL'
ALTER ROLE :"STEATIFY_USER" WITH LOGIN PASSWORD :'STEATIFY_PASSWORD';
SQL

db_exists="$(psql_admin -tA <<'SQL' || true
SELECT 1 FROM pg_database WHERE datname = :'STEATIFY_DB';
SQL
)"
if [ "$db_exists" = "1" ]; then
  echo "database_exists=$STEATIFY_DB"
else
  echo "creating_database=$STEATIFY_DB"
  psql_admin <<'SQL'
CREATE DATABASE :"STEATIFY_DB" OWNER :"STEATIFY_USER";
SQL
fi

docker exec \
  -e PGPASSWORD="$DB_PASSWORD" \
  -e STEATIFY_DB="$STEATIFY_DB" \
  -e STEATIFY_USER="$STEATIFY_USER" \
  -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -v STEATIFY_DB="$STEATIFY_DB" -v STEATIFY_USER="$STEATIFY_USER" -U "$ADMIN_USER" -d "$STEATIFY_DB" <<'SQL'
GRANT ALL PRIVILEGES ON DATABASE :"STEATIFY_DB" TO :"STEATIFY_USER";
GRANT ALL ON SCHEMA public TO :"STEATIFY_USER";
ALTER SCHEMA public OWNER TO :"STEATIFY_USER";
SQL

echo "ok=steatify_db_ready db=$STEATIFY_DB user=$STEATIFY_USER container=$DB_CONTAINER"

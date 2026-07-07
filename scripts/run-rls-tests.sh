#!/usr/bin/env bash
# Ejecuta la suite de tests de RLS/constraints contra el Supabase local.
# Requiere `supabase start` corriendo. Uso: bash scripts/run-rls-tests.sh
set -euo pipefail

DB_CONTAINER="supabase_db_tool-rioja-parking"
SQL_FILE="tests/rls/rls_test.sql"

if ! docker ps --format '{{.Names}}' | grep -q "$DB_CONTAINER"; then
  echo "❌ El contenedor $DB_CONTAINER no está corriendo. Ejecuta: npx supabase start"
  exit 1
fi

echo "▶ Copiando y ejecutando $SQL_FILE ..."
docker cp "$SQL_FILE" "$DB_CONTAINER:/tmp/rls_test.sql"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/rls_test.sql

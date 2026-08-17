#!/usr/bin/env bash
# Apply supabase/bootstrap-schema.sql using DATABASE_URL (requires psql).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required."
  echo "Supabase → Project Settings → Database → Connection string (URI)."
  echo "Add it to .env, then re-run: npm run db:apply"
  exit 1
fi

PSQL="${PSQL:-psql}"
if ! command -v "$PSQL" >/dev/null 2>&1; then
  if [[ -x /opt/homebrew/opt/libpq/bin/psql ]]; then
    PSQL=/opt/homebrew/opt/libpq/bin/psql
  else
    echo "psql not found. brew install libpq && brew link --force libpq"
    exit 1
  fi
fi

"$PSQL" "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/bootstrap-schema.sql"
echo "Schema applied."

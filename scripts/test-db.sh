#!/usr/bin/env bash
# Teste migrations + seed + tests SQL sur un PostgreSQL local jetable (jamais sur Supabase réel).
# Usage: scripts/test-db.sh   (nécessite PostgreSQL 16 installé ; utilise le cluster "kredia_test")
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGV=${PGV:-16}
BIN=/usr/lib/postgresql/$PGV/bin
DATA=${KREDIA_TEST_PGDATA:-/tmp/kredia_pg}
PORT=${KREDIA_TEST_PGPORT:-54329}
if [ ! -d "$DATA" ]; then
  mkdir -p "$DATA"; chown postgres "$DATA" 2>/dev/null || true
  su postgres -c "$BIN/initdb -D $DATA -A trust >/dev/null"
fi
if ! su postgres -c "$BIN/pg_ctl -D $DATA status" >/dev/null 2>&1; then
  su postgres -c "$BIN/pg_ctl -D $DATA -o '-p $PORT -k /tmp' -l $DATA/log -w start" >/dev/null
fi
PSQL="psql -h /tmp -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -d postgres -c "drop database if exists kredia_test" -c "create database kredia_test"
export PGOPTIONS='--client-min-messages=warning'
$PSQL -d kredia_test -f "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do echo "→ $(basename "$f")"; $PSQL -d kredia_test -f "$f" >/dev/null; done
$PSQL -d kredia_test -f "$ROOT/supabase/seed/00_reference.sql"
echo "set kredia.allow_demo='on';" > /tmp/kredia_demo.sql
cat "$ROOT/supabase/seed/10_demo.sql" >> /tmp/kredia_demo.sql
$PSQL -d kredia_test -f /tmp/kredia_demo.sql >/dev/null
for f in "$ROOT"/supabase/tests/[1-9]*.sql; do echo "✔ test $(basename "$f")"; $PSQL -d kredia_test -f "$f" >/dev/null; done
echo "ALL DB TESTS PASSED"

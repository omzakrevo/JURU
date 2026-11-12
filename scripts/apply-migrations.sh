#!/usr/bin/env bash
# Applique les migrations JURU sur VOTRE Supabase auto-hébergé (une seule fois chacune, ordre alphabétique).
# Usage : DATABASE_URL='postgresql://postgres:MOT_DE_PASSE@IP_VPS:5432/postgres' scripts/apply-migrations.sh [--seed-ref] [--seed-demo]
#   --seed-ref   charge supabase/seed/00_reference.sql (pays, règles, commissions, plan comptable) — sûr en production
#   --seed-demo  charge supabase/seed/10_demo.sql (données FICTIVES) — REFUSÉ si JURU_ENV=production
set -euo pipefail
: "${DATABASE_URL:?Définissez DATABASE_URL (connexion Postgres directe de votre VPS Supabase)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -c "create schema if not exists juru_meta; create table if not exists juru_meta.migrations (name text primary key, applied_at timestamptz not null default now());"
for f in "$ROOT"/supabase/migrations/*.sql; do
  n="$(basename "$f")"
  done_already=$("${PSQL[@]}" -At -c "select 1 from juru_meta.migrations where name = '$n'")
  if [ -n "$done_already" ]; then echo "= $n (déjà appliquée)"; continue; fi
  echo "→ $n"
  "${PSQL[@]}" --single-transaction -f "$f"
  "${PSQL[@]}" -c "insert into juru_meta.migrations(name) values ('$n')"
done
for arg in "$@"; do
  case "$arg" in
    --seed-ref) echo "→ seed référence"; "${PSQL[@]}" -f "$ROOT/supabase/seed/00_reference.sql" ;;
    --seed-demo)
      if [ "${JURU_ENV:-}" = "production" ]; then echo "Refusé : JURU_ENV=production"; exit 1; fi
      echo "→ seed DÉMO (fictif)"; { echo "set juru.allow_demo='on';"; cat "$ROOT/supabase/seed/10_demo.sql"; } | "${PSQL[@]}" ;;
  esac
done
echo "Terminé."

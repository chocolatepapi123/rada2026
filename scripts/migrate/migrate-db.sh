#!/usr/bin/env bash
# Phase 20: copy the RADA database from the OLD Supabase project to the NEW one.
# Run by .github/workflows/migrate-db.yml on a GitHub runner. Nothing is uploaded as an artifact
# (cron commands can contain keys), everything lives in a temp folder that is deleted at the end.
#
# Secrets: OLD_DB_URL, NEW_DB_URL = "Session pooler" URIs.  Optional: NEW_SERVICE_ROLE_KEY (swapped into cron jobs that hold a key).
# Env:  DRY_RUN=true (default) = checks + a TRIAL restore that is rolled back, saves nothing.
#       DRY_RUN=false          = trial first, then the real copy.      FORCE=true allows a non-empty NEW db.
set -euo pipefail

: "${OLD_DB_URL:?Missing OLD_DB_URL secret}"
: "${NEW_DB_URL:?Missing NEW_DB_URL secret}"
DRY_RUN="${DRY_RUN:-true}"
FORCE="${FORCE:-false}"
NEW_SERVICE_ROLE_KEY="${NEW_SERVICE_ROLE_KEY:-}"
export NEW_SERVICE_ROLE_KEY

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

ref_of() { sed -n 's/.*postgres\.\([a-z0-9]\{20\}\)[:@].*/\1/p' <<<"$1"; }
OLD_REF="$(ref_of "$OLD_DB_URL")"
NEW_REF="$(ref_of "$NEW_DB_URL")"
if [ -z "$OLD_REF" ] || [ -z "$NEW_REF" ]; then
  echo "✖ Could not read the project ref from the URLs. Use the 'Session pooler' URI (user looks like postgres.<ref>)."; exit 1
fi
if [ "$OLD_REF" = "$NEW_REF" ]; then echo "✖ OLD_DB_URL and NEW_DB_URL point at the same project."; exit 1; fi
echo "Old project: $OLD_REF  ->  New project: $NEW_REF"

qold() { psql "$OLD_DB_URL" -X -At -v ON_ERROR_STOP=1 "$@"; }
qnew() { psql "$NEW_DB_URL" -X -At -v ON_ERROR_STOP=1 "$@"; }
apply() { # apply <file> <label>  -- one transaction, stops at the first error
  echo "▶ Applying $2"
  psql "$NEW_DB_URL" -X -q -v ON_ERROR_STOP=1 -1 -f "$1" >"$WORK/apply.log" 2>&1 || { echo "✖ $2 failed:"; tail -n 15 "$WORK/apply.log"; exit 1; }
}
apply_quiet() { # same as apply but never prints details (the file holds secret values)
  echo "▶ Applying $2"
  psql "$NEW_DB_URL" -X -q -v ON_ERROR_STOP=1 -1 -f "$1" >/dev/null 2>&1 || { echo "✖ $2 failed (details hidden because they may contain secrets)"; exit 1; }
}

# Runs the whole restore inside a transaction that is ALWAYS rolled back, carrying on after every error,
# so one run lists every problem instead of stopping at the first.
trial_restore() {
  echo "▶ Trial restore (nothing is saved, everything is rolled back)"
  {
    echo "BEGIN;"
    echo "create extension if not exists pg_cron with schema pg_catalog;"
    echo "create extension if not exists pg_net with schema extensions;"
    cat "$WORK/public.sql"
    echo "RESET search_path;"
    for f in buckets storage_policies realtime auth_triggers cron; do
      if [ -s "$WORK/$f.sql" ]; then cat "$WORK/$f.sql"; fi
    done
    echo "ROLLBACK;"
  } >"$WORK/trial.sql"
  psql "$NEW_DB_URL" -X -q -v ON_ERROR_STOP=0 -v ON_ERROR_ROLLBACK=on -v VERBOSITY=terse -f "$WORK/trial.sql" >"$WORK/trial.out" 2>&1 || true
  grep 'ERROR' "$WORK/trial.out" >"$WORK/trial.err" || true
  local n; n="$(wc -l <"$WORK/trial.err" | tr -d ' ')"
  if [ "$n" != "0" ]; then
    echo "✖ The trial found $n problem(s). Nothing was saved. First ones:"
    head -n 25 "$WORK/trial.err" | while IFS= read -r line; do
      ln="$(sed -n 's/^psql:[^:]*:\([0-9]*\):.*/\1/p' <<<"$line")"
      echo "  ${line#psql:*:}" | cut -c1-220
      if [ -n "$ln" ]; then echo "     > $(sed -n "${ln}p" "$WORK/trial.sql" | cut -c1-160)"; fi
    done
    exit 1
  fi
  echo "✔ Trial restore passed with no errors"
}

echo "▶ Checking connections"
if ! out="$(qold -c 'select 1' 2>&1)"; then
  echo "✖ Cannot connect to the OLD database. If this mentions 'restricted' or 'quota', the restriction also blocks direct database access."
  echo "  Detail: $out"; exit 1
fi
if ! out="$(qnew -c 'select 1' 2>&1)"; then echo "✖ Cannot connect to the NEW database: $out"; exit 1; fi

OLD_VER="$(qold -c 'show server_version_num')"; NEW_VER="$(qnew -c 'show server_version_num')"
echo "Postgres versions: old $OLD_VER, new $NEW_VER"
if [ "${NEW_VER%????}" -lt "${OLD_VER%????}" ] 2>/dev/null; then echo "✖ New project runs an older Postgres than the old one."; exit 1; fi

NEW_TABLES="$(qnew -c "select count(*) from information_schema.tables where table_schema in ('public','archive')")"
if [ "$NEW_TABLES" != "0" ] && [ "$FORCE" != "true" ]; then
  echo "✖ The NEW project already has $NEW_TABLES table(s) in public/archive. It must be empty (or set force=true)."; exit 1
fi

echo "▶ Old database summary"
qold -F' | ' -c "
select 'tables', count(*) from information_schema.tables where table_schema in ('public','archive') and table_type='BASE TABLE'
union all select 'functions', count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
union all select 'policies', count(*) from pg_policies where schemaname='public'
union all select 'auth users', count(*) from auth.users
union all select 'cron jobs', count(*) from cron.job
union all select 'storage policies', count(*) from pg_policies where schemaname='storage'"

# ── dump everything first (read-only on the old project) ────────────────────
echo "▶ Dumping the public and archive schemas (structure + data)"
pg_dump "$OLD_DB_URL" --schema=public --schema=archive --no-owner --no-publications --no-subscriptions -f "$WORK/public.sql"
# Statements the new project does not allow (or already has by default):
sed -i -e '/^CREATE SCHEMA public;$/d' -e '/^ALTER DEFAULT PRIVILEGES /d' -e '/^COMMENT ON SCHEMA public /d' "$WORK/public.sql"
echo "  dump size: $(du -h "$WORK/public.sql" | cut -f1)"

echo "▶ Collecting extras from the old project"
qold -c "select format('insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values (%L,%L,%L,%L,%L) on conflict (id) do nothing;', id,name,public,file_size_limit,allowed_mime_types) from storage.buckets" >"$WORK/buckets.sql"
qold -c "select format('drop policy if exists %I on storage.%I; create policy %I on storage.%I as %s for %s to %s %s %s;', policyname,tablename,policyname,tablename,permissive,cmd,array_to_string(roles,','),
  case when qual is not null then 'using ('||qual||')' else '' end,
  case when with_check is not null then 'with check ('||with_check||')' else '' end)
  from pg_policies where schemaname='storage'" >"$WORK/storage_policies.sql"
qold -c "select format('alter publication %I add table %I.%I;', pubname, schemaname, tablename) from pg_publication_tables where pubname in ('supabase_realtime','supabase_realtime_messages_publication') and schemaname='public'" >"$WORK/realtime.sql"
qold -c "select pg_get_triggerdef(t.oid)||';' from pg_trigger t where t.tgrelid='auth.users'::regclass and not t.tgisinternal" >"$WORK/auth_triggers.sql"
qold -c "select format('select cron.schedule(%L, %L, %L);', jobname, schedule, command) from cron.job order by jobname" >"$WORK/cron.sql"
sed -i "s/$OLD_REF/$NEW_REF/g" "$WORK/cron.sql"
KEYS="$(grep -cE 'eyJ[A-Za-z0-9_-]{10,}|sb_secret_' "$WORK/cron.sql" || true)"
if [ "${KEYS:-0}" -gt 0 ]; then
  if [ -z "$NEW_SERVICE_ROLE_KEY" ]; then echo "✖ $KEYS cron job(s) contain an API key. Add the NEW_SERVICE_ROLE_KEY secret and re-run."; exit 1; fi
  perl -pi -e 's/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/$ENV{NEW_SERVICE_ROLE_KEY}/g; s/sb_secret_[A-Za-z0-9_-]+/$ENV{NEW_SERVICE_ROLE_KEY}/g' "$WORK/cron.sql"
  echo "  swapped the API key in $KEYS cron job(s) for the new project's key"
fi
qold -c "select format('select vault.create_secret(%L, %L, %L);', decrypted_secret, name, coalesce(description,'')) from vault.decrypted_secrets" >"$WORK/vault.sql"
echo "  vault secrets to copy: $(grep -c . "$WORK/vault.sql" || true)"
echo "  cron jobs to create:"; qold -F' | ' -c "select jobname, schedule from cron.job order by jobname" | sed 's/^/    /'

# ── trial: find every problem before anything is saved ──────────────────────
trial_restore

if [ "$DRY_RUN" = "true" ]; then
  echo "✔ Dry run finished: connections work, the new database is empty and the full restore would succeed. Run again with dry_run off and confirm=MIGRATE."
  exit 0
fi

# ── real copy ───────────────────────────────────────────────────────────────
echo "▶ Enabling extensions on the new project"
psql "$NEW_DB_URL" -X -q -c "create extension if not exists pg_cron with schema pg_catalog;" || echo "  (pg_cron: enable it in Dashboard > Database > Extensions, then re-run)"
psql "$NEW_DB_URL" -X -q -c "create extension if not exists pg_net with schema extensions;" || true

OLD_USERS_N="$(qold -c 'select count(*) from auth.users')"
NEW_USERS_N="$(qnew -c 'select count(*) from auth.users')"
if [ "$NEW_USERS_N" = "0" ]; then
  echo "▶ Dumping accounts"
  pg_dump "$OLD_DB_URL" --data-only --no-owner --no-privileges -t auth.users -t auth.identities -f "$WORK/auth.sql"
  apply "$WORK/auth.sql" "accounts (auth.users, auth.identities)"
elif [ "$NEW_USERS_N" = "$OLD_USERS_N" ]; then
  echo "▶ Accounts already copied ($NEW_USERS_N of $OLD_USERS_N), skipping"
else
  echo "✖ The new project has $NEW_USERS_N accounts but the old one has $OLD_USERS_N. Delete the new project's accounts (Authentication > Users) and re-run."; exit 1
fi

apply "$WORK/public.sql" "public + archive schemas"

if [ -s "$WORK/vault.sql" ]; then apply_quiet "$WORK/vault.sql" "vault secrets"; fi
for f in buckets storage_policies realtime auth_triggers cron; do
  if [ -s "$WORK/$f.sql" ]; then apply "$WORK/$f.sql" "$f"; else echo "  (nothing to apply for $f)"; fi
done

# ── verify: row counts must match ───────────────────────────────────────────
echo "▶ Verifying row counts"
counts() {
  local url="$1" q
  q="$(psql "$url" -X -At -c "select string_agg(format('select %L as t, count(*) as n from %I.%I', table_schema||'.'||table_name, table_schema, table_name), ' union all ' order by table_schema, table_name) from information_schema.tables where table_schema in ('public','archive') and table_type='BASE TABLE'")"
  psql "$url" -X -At -F' | ' -c "select * from ($q) x order by t"
}
counts "$OLD_DB_URL" >"$WORK/old.counts"; counts "$NEW_DB_URL" >"$WORK/new.counts"
echo "  accounts: old $OLD_USERS_N, new $(qnew -c 'select count(*) from auth.users')"
if diff "$WORK/old.counts" "$WORK/new.counts" >"$WORK/diff.txt"; then
  echo "✔ All $(wc -l <"$WORK/old.counts") tables match."
else
  echo "⚠ Some tables differ. A busy table (the old project's cron jobs keep writing) can be off by a few rows, a big gap is not normal:"; cat "$WORK/diff.txt"; exit 1
fi

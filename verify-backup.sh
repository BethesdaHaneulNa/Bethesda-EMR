#!/bin/sh
# Prove that a backup can actually be restored.
#
#   ./verify-backup.sh                                       newest backup
#   ./verify-backup.sh backups/bethesda_2026-07-15_0200.sql.gz
#   ./verify-backup.sh --strict        right after "Back up now": exact match with live
#   DB_CONTAINER=bethesda-s-settings-db ./verify-backup.sh    a development stack
#
# Environment overrides: DB_CONTAINER (default bethesda-emr-db), API_CONTAINER
# (default: DB_CONTAINER with -db replaced by -api), BACKUP_DIR (default: where
# Docker mounted /backups into the app, else ./backups).
#
# It restores the backup into a temporary database, compares that against the live
# one, and drops the temporary database again. Your data is never written to: the
# only thing created and destroyed is a database called bethesda_verify_tmp.
#
# An untested backup is not a backup. Run this after setting up a clinic, and
# occasionally after that.
set -e
cd "$(dirname "$0")"

# Run under Git Bash on Windows, MSYS rewrites anything that looks like a Unix path
# into a Windows one before the program sees it -- so the container is asked about
# C:/Users/.../Temp/verify-backup.sql.gz and reports a perfectly good backup as
# corrupt. Harmless on a real Linux or NAS host, where these are simply unset.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

DB_CONTAINER="${DB_CONTAINER:-bethesda-emr-db}"
API_CONTAINER="${API_CONTAINER:-$(echo "$DB_CONTAINER" | sed 's/-db$/-api/')}"
DB_USER=medconnect
DB_NAME=medconnect
TMP_DB=bethesda_verify_tmp

say()  { echo "  $*"; }
step() { echo ""; echo "==> $*"; }
ok()   { echo "  [ok]   $*"; }
bad()  { echo "  [FAIL] $*"; }
info() { echo "  [info] $*"; }
die()  { echo ""; echo "ERROR: $*" >&2; exit 1; }

STRICT=""
if [ "$1" = "--strict" ]; then STRICT=1; shift; fi

# The output, not only the exit code: inspect succeeds on a stopped container too.
[ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null)" = "true" ] \
  || die "The database container ($DB_CONTAINER) is not running. Start the app first."

# The backups are wherever BACKUP_PATH put them - often another disk - not
# necessarily next to this script. Docker knows: it mounted that folder into the
# app as /backups. (The status window finds it the same way.)
if [ -z "$BACKUP_DIR" ]; then
  BACKUP_DIR="$(docker inspect "$API_CONTAINER" --format '{{range .Mounts}}{{.Destination}}={{.Source}}{{println}}{{end}}' 2>/dev/null \
                | sed -n 's|^/backups=||p' | head -1)"
  if [ -z "$BACKUP_DIR" ] || [ ! -d "$BACKUP_DIR" ]; then BACKUP_DIR=backups; fi
fi
say "backups: $BACKUP_DIR"
newest_backup() { ls "$BACKUP_DIR"/bethesda_*.sql.gz 2>/dev/null | sort | tail -1; }

FILE="$1"
if [ -z "$FILE" ]; then
  FILE="$(newest_backup)"
  [ -n "$FILE" ] || die "No backups found in $BACKUP_DIR. Take one from Settings -> Backup first."
fi
[ -f "$FILE" ] || die "No such file: $FILE"

[ -f .env ] || die "No .env here - run this from the folder the app is installed in."
PW="$(sed -n 's/^DB_PASSWORD=//p' .env | head -1)"
[ -n "$PW" ] || die "DB_PASSWORD is not set in .env"

echo "Verifying $(basename "$FILE")"
say "$(ls -lh "$FILE" | awk '{print $5", taken "$6" "$7" "$8}')"

psql_q() {  # psql_q <database> <sql>
  # client_min_messages=warning keeps "NOTICE: database does not exist, skipping"
  # out of the output; it is noise here, not news.
  printf '%s' "$2" | docker exec -i -e PGPASSWORD="$PW" -e PGOPTIONS='-c client_min_messages=warning' \
    "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$1" -t -A -F'|' 2>/dev/null \
    | grep -v '^$' || true
}

# Row counts, checksums and sequences come straight out of the catalogue, so a table
# added in a later version is picked up without touching this script.
COUNTS="select table_name,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I','public',table_name), false,true,'')))[1]::text
from information_schema.tables
where table_schema='public' and table_type='BASE TABLE' order by table_name;"
SUMS="select table_name,
       coalesce((xpath('/row/c/text()', query_to_xml(format('select md5(string_agg(t::text, chr(10) order by t::text)) as c from %I.%I t','public',table_name), false,true,'')))[1]::text, 'empty')
from information_schema.tables
where table_schema='public' and table_type='BASE TABLE' order by table_name;"
SEQS="select s.relname, coalesce(pg_sequence_last_value(s.oid)::text,'unused')
from pg_class s join pg_namespace n on n.oid=s.relnamespace
where s.relkind='S' and n.nspname='public' order by s.relname;"
SHAPE="select (select count(*) from pg_indexes where schemaname='public')::text || ' indexes, ' ||
       (select count(*) from information_schema.table_constraints where constraint_schema='public')::text || ' constraints, ' ||
       (select count(*) from information_schema.routines where routine_schema='public')::text || ' routines';"
# Every sequence that is behind the largest id already in its own table. A restore that
# loses these looks perfect until the first new patient collides with an existing id --
# and unlike the comparisons below, this is answerable from the restored database alone,
# so it works for an old backup too.
BEHIND="select seq.relname || ' is behind ' || tab.relname || '.' || att.attname
from pg_class seq
join pg_depend d on d.objid = seq.oid and d.classid = 'pg_class'::regclass and d.deptype in ('a','i')
join pg_class tab on tab.oid = d.refobjid
join pg_attribute att on att.attrelid = tab.oid and att.attnum = d.refobjsubid
join pg_namespace n on n.oid = seq.relnamespace
where seq.relkind = 'S' and n.nspname = 'public'
  and coalesce(pg_sequence_last_value(seq.oid), 0) <
      coalesce((xpath('/row/c/text()', query_to_xml(format('select max(%I)::text as c from %I.%I', att.attname, 'public', tab.relname), false, true, '')))[1]::text::bigint, 0)
order by 1;"

WORK="$(mktemp -d)"
FAILED=""
cleanup() {
  step "Cleaning up"
  psql_q postgres "DROP DATABASE IF EXISTS $TMP_DB;" >/dev/null 2>&1 || true
  docker exec "$DB_CONTAINER" rm -f /tmp/verify-backup.sql.gz >/dev/null 2>&1 || true
  rm -rf "$WORK"
  say "temporary database removed - your data was never touched"
}
trap cleanup EXIT

step "Restoring into a temporary database ($TMP_DB)"
psql_q postgres "DROP DATABASE IF EXISTS $TMP_DB;" >/dev/null
psql_q postgres "CREATE DATABASE $TMP_DB;" >/dev/null

docker cp "$FILE" "$DB_CONTAINER:/tmp/verify-backup.sql.gz" >/dev/null \
  || die "Could not copy the backup into the database container."

# Check the archive before feeding it anywhere. A truncated file is the likely kind of
# damage -- a disk that filled up mid-dump, a USB pulled early -- and it deserves its
# own message rather than being reported as a hundred mismatched tables.
if ! docker exec "$DB_CONTAINER" gunzip -t /tmp/verify-backup.sql.gz >/dev/null 2>&1; then
  bad "the file is not a complete gzip archive - it is truncated or corrupted"
  die "This backup is damaged and cannot be used. Try an older one."
fi
ok "archive is intact"

# set -o pipefail, and it is not optional: without it the pipeline reports psql's exit
# code and gunzip's failure disappears. A half-decompressed file would be committed as
# far as it got and the restore would call itself a success -- the exact failure this
# script exists to catch.
if ! docker exec -e PGPASSWORD="$PW" "$DB_CONTAINER" sh -c \
     "set -o pipefail; gunzip -c /tmp/verify-backup.sql.gz | psql -v ON_ERROR_STOP=1 --single-transaction -U $DB_USER -d $TMP_DB" \
     > "$WORK/restore.log" 2>&1; then
  bad "the backup does not restore"
  tail -15 "$WORK/restore.log"
  die "This backup cannot be restored. Try an older one, and find out why this happened."
fi
ok "restored with no errors"

# Is this the backup the live database was most recently dumped from? Only then does it
# make sense to compare the two at all. Restoring an older one is a perfectly normal
# thing to do -- it is what you do after losing a day -- and it must not be reported as
# a broken backup just because the clinic has seen patients since.
NEWEST="$(newest_backup)"
IS_NEWEST=""
[ -n "$NEWEST" ] && [ "$(basename "$FILE")" = "$(basename "$NEWEST")" ] && IS_NEWEST=1

step "Checking the restored database"

psql_q "$TMP_DB" "$SHAPE" > "$WORK/shape.tmp"
ok "schema: $(cat "$WORK/shape.tmp")"
psql_q "$TMP_DB" "$COUNTS" > "$WORK/counts.tmp"
ok "$(wc -l < "$WORK/counts.tmp" | tr -d ' ') tables, $(awk -F'|' '{s+=$2} END{print s+0}' "$WORK/counts.tmp") rows"

# This one is a real fault in any backup, old or new.
psql_q "$TMP_DB" "$BEHIND" > "$WORK/behind.tmp"
if [ -s "$WORK/behind.tmp" ]; then
  bad "sequences are behind their own data - new records would collide with existing ids:"
  sed 's/^/         /' "$WORK/behind.tmp"
  FAILED=1
else
  ok "every sequence is ahead of its own data"
fi

# From an older version of the app? It restored here because this is an empty
# database; onto the running one the usual restore commands stop ("cannot drop
# constraint ... depend on it") and DEPLOYMENT.md 5b's other commands are needed.
# Found in the restore drill of 2026-09-29 (wiki/modules/settings.md 2.13).
OLDER_VERSION=""
if [ "$(psql_q "$TMP_DB" "select (to_regclass('public.schema_migrations') is not null)::text;")" = "true" ]; then
  psql_q "$DB_NAME" "select filename from schema_migrations order by 1;" > "$WORK/mig.live"
  psql_q "$TMP_DB"  "select filename from schema_migrations order by 1;" > "$WORK/mig.tmp"
  NOT_IN_BACKUP="$(grep -vxF -f "$WORK/mig.tmp" "$WORK/mig.live" | tr '\n' ' ' || true)"
  if [ -n "$NOT_IN_BACKUP" ]; then
    OLDER_VERSION=1
    info "this backup is from an older version of the app - database update(s) that came after it: $NOT_IN_BACKUP"
    say "It restores into an empty database, as it just did here. To put it back on this machine,"
    say "use DEPLOYMENT.md 5b, 'If the backup is older than the app': the usual commands stop on it."
    if [ -n "$STRICT" ]; then
      bad "with --strict the backup must be from the running version - press Back up now first"
      FAILED=1; STRICT_OLDER=1
    fi
  else
    ok "same version as the running app ($(wc -l < "$WORK/mig.tmp" | tr -d ' ') database updates)"
  fi
fi
older_note() {
  if [ -n "$OLDER_VERSION" ]; then
    echo "  It is from an older version of the app: restore it with DEPLOYMENT.md 5b, 'If the backup is older than the app'."
  fi
}

if [ -z "$IS_NEWEST" ]; then
  echo ""
  say "$(basename "$FILE") is not the newest backup, so it is not compared against the"
  say "live database - it is older, and differing from today's data is what it is for."
  echo ""
  if [ -n "$FAILED" ]; then
    echo "VERIFY FAILED - this backup restores, but its contents are not sound."
    exit 1
  fi
  echo "VERIFIED - $(basename "$FILE") restores correctly."
  older_note
  exit 0
fi

# Two different questions, kept apart on purpose (verify-backup.ps1 has the longer
# story): is the backup missing structure - a fault, unless the app was updated
# after it was taken - and does the data match, which it only can if nobody has
# entered anything since. The nightly backup is from 02:00; a clinic that had
# registered one patient since used to get "VERIFY FAILED - Do not rely on it"
# about a perfectly good backup. Differences are now listed, and only --strict
# (run straight after "Back up now") counts them as failure. Soundness on its own
# is proven above: a clean single-transaction restore with ON_ERROR_STOP, and every
# sequence ahead of its own data.
step "Comparing against the live database"

psql_q "$DB_NAME" "$COUNTS" > "$WORK/counts.live"

count_of() { sed -n "s/^$1|//p" "$2" | head -1; }
LIVE_MIG="$(count_of schema_migrations "$WORK/counts.live")"; LIVE_MIG="${LIVE_MIG:-0}"
TMP_MIG="$(count_of schema_migrations "$WORK/counts.tmp")";   TMP_MIG="${TMP_MIG:-0}"
UPDATED=""
if [ "$LIVE_MIG" -gt "$TMP_MIG" ]; then
  UPDATED=1
  info "the app was updated after this backup ($((LIVE_MIG - TMP_MIG)) newer database migration(s)), so the schema is expected to differ"
fi

cut -d'|' -f1 "$WORK/counts.live" | sort > "$WORK/tables.live"
cut -d'|' -f1 "$WORK/counts.tmp"  | sort > "$WORK/tables.tmp"
MISSING="$(comm -23 "$WORK/tables.live" "$WORK/tables.tmp" | tr '\n' ' ')"
if [ -n "$MISSING" ] && [ -z "$UPDATED" ]; then
  bad "tables missing from the backup: $MISSING"; FAILED=1
elif [ -z "$MISSING" ]; then
  ok "all $(wc -l < "$WORK/tables.live" | tr -d ' ') tables of the live database are in the backup"
fi

psql_q "$DB_NAME" "$SHAPE" > "$WORK/shape.live"
if cmp -s "$WORK/shape.live" "$WORK/shape.tmp"; then
  ok "schema: $(cat "$WORK/shape.live")"
elif [ -n "$UPDATED" ]; then
  info "schema differs (expected after the update)"; say "live:     $(cat "$WORK/shape.live")"; say "restored: $(cat "$WORK/shape.tmp")"
else
  bad "schema differs"; say "live:     $(cat "$WORK/shape.live")"; say "restored: $(cat "$WORK/shape.tmp")"; FAILED=1
fi

psql_q "$DB_NAME" "$SEQS" > "$WORK/seqs.live"
psql_q "$TMP_DB"  "$SEQS" > "$WORK/seqs.tmp"
psql_q "$DB_NAME" "$SUMS" > "$WORK/sums.live"
psql_q "$TMP_DB"  "$SUMS" > "$WORK/sums.tmp"

# Every table (or sequence - one can move with no row left to show for it) whose
# rows, value or contents differ from live.
{ diff "$WORK/counts.live" "$WORK/counts.tmp"; diff "$WORK/seqs.live" "$WORK/seqs.tmp"; diff "$WORK/sums.live" "$WORK/sums.tmp"; } \
  | sed -n 's/^[<>] \([^|]*\)|.*/\1/p' | sort -u > "$WORK/changed" || true
# Written continuously by the system itself, not by people: they differ even
# straight after a backup, so even --strict does not hold them against it.
SYSTEM='service_heartbeat|document_log|worklist_log|service_heartbeat_id_seq|document_log_id_seq|worklist_log_id_seq|schema_migrations'
BY_PEOPLE="$(grep -vxE "$SYSTEM" "$WORK/changed" | tr '\n' ' ' || true)"
STRICT_MISMATCH=""

if [ ! -s "$WORK/changed" ]; then
  ok "identical to the live database: $(wc -l < "$WORK/counts.live" | tr -d ' ') tables, $(awk -F'|' '{s+=$2} END{print s+0}' "$WORK/counts.live") rows, every sequence and every table's contents"
elif [ -z "$BY_PEOPLE" ]; then
  ok "identical to the live database, except $(tr '\n' ' ' < "$WORK/changed")- written continuously by the system, so they are expected to have moved on"
elif [ -n "$STRICT" ]; then
  bad "differs from the live database in: $BY_PEOPLE"
  for t in $BY_PEOPLE; do
    L="$(count_of "$t" "$WORK/counts.live")"; B="$(count_of "$t" "$WORK/counts.tmp")"
    if [ -n "$L" ] && [ "$L" != "$B" ]; then say "       $t: live $L rows, backup $B"; fi
  done
  say "(With --strict nothing may have changed since the backup. If someone was working,"
  say " take a new backup and run this again straight after it.)"
  FAILED=1; STRICT_MISMATCH=1
else
  info "the live database has changed since this backup was taken, in: $BY_PEOPLE"
  say "This is normal while the clinic is working and says nothing against the backup."
  say "For an exact comparison: press Back up now, then run this again with --strict."
fi

echo ""
if [ -n "$FAILED" ]; then
  if [ -n "$STRICT_MISMATCH" ] || [ -n "$STRICT_OLDER" ]; then
    echo "VERIFY FAILED - this backup restores, but does not match the live database (--strict)."
  else
    echo "VERIFY FAILED - this backup would not restore cleanly. Do not rely on it."
  fi
  exit 1
fi
echo "VERIFIED - $(basename "$FILE") restores correctly."
older_note

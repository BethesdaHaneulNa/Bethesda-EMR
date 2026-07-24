#!/bin/sh
# Prove that a backup can actually be restored.
#
#   ./verify-backup.sh                                       newest backup
#   ./verify-backup.sh backups/bethesda_2026-07-15_0200.sql.gz
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

DB_CONTAINER=bethesda-emr-db
DB_USER=medconnect
DB_NAME=medconnect
TMP_DB=bethesda_verify_tmp

say()  { echo "  $*"; }
step() { echo ""; echo "==> $*"; }
ok()   { echo "  [ok]   $*"; }
bad()  { echo "  [FAIL] $*"; }
die()  { echo ""; echo "ERROR: $*" >&2; exit 1; }

docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" >/dev/null 2>&1 \
  || die "The database container ($DB_CONTAINER) is not running. Start the app first."

FILE="$1"
if [ -z "$FILE" ]; then
  FILE="$(ls backups/bethesda_*.sql.gz 2>/dev/null | sort | tail -1)"
  [ -n "$FILE" ] || die "No backups found in ./backups/. Take one from Settings -> Backup first."
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
# make sense to expect the two to match. Restoring an older one is a perfectly normal
# thing to do -- it is what you do after losing a day -- and it must not be reported as
# a broken backup just because the clinic has seen patients since.
NEWEST="$(ls backups/bethesda_*.sql.gz 2>/dev/null | sort | tail -1)"
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
  exit 0
fi

step "Comparing against the live database"

psql_q "$DB_NAME" "$SHAPE" > "$WORK/shape.live"
psql_q "$TMP_DB"  "$SHAPE" > "$WORK/shape.tmp"
if cmp -s "$WORK/shape.live" "$WORK/shape.tmp"; then
  ok "schema: $(cat "$WORK/shape.live")"
else
  bad "schema differs"; say "live:     $(cat "$WORK/shape.live")"; say "restored: $(cat "$WORK/shape.tmp")"; FAILED=1
fi

psql_q "$DB_NAME" "$COUNTS" > "$WORK/counts.live"
psql_q "$TMP_DB"  "$COUNTS" > "$WORK/counts.tmp"
if cmp -s "$WORK/counts.live" "$WORK/counts.tmp"; then
  ok "$(wc -l < "$WORK/counts.live" | tr -d ' ') tables, $(awk -F'|' '{s+=$2} END{print s}' "$WORK/counts.live") rows - counts match"
else
  bad "row counts differ:"; diff "$WORK/counts.live" "$WORK/counts.tmp" | sed 's/^/         /'; FAILED=1
fi

# A restore that loses sequence values looks perfect until the first new record
# collides with an existing id. This is the check people skip.
psql_q "$DB_NAME" "$SEQS" > "$WORK/seqs.live"
psql_q "$TMP_DB"  "$SEQS" > "$WORK/seqs.tmp"
if cmp -s "$WORK/seqs.live" "$WORK/seqs.tmp"; then
  ok "$(wc -l < "$WORK/seqs.live" | tr -d ' ') sequences at the same values"
else
  bad "sequence values differ - new records would collide after a restore:"
  diff "$WORK/seqs.live" "$WORK/seqs.tmp" | sed 's/^/         /'; FAILED=1
fi

psql_q "$DB_NAME" "$SUMS" > "$WORK/sums.live"
psql_q "$TMP_DB"  "$SUMS" > "$WORK/sums.tmp"
if cmp -s "$WORK/sums.live" "$WORK/sums.tmp"; then
  ok "every table's contents match"
else
  # The live database keeps moving while the backup stands still, so tables written to
  # continuously will differ. That is expected, not a fault.
  CHANGED="$(diff "$WORK/sums.live" "$WORK/sums.tmp" | sed -n 's/^[<>] \([^|]*\)|.*/\1/p' | sort -u)"
  UNEXPECTED="$(echo "$CHANGED" | grep -vxE 'service_heartbeat|document_log|worklist_log' || true)"
  if [ -n "$UNEXPECTED" ]; then
    bad "contents differ in: $(echo "$UNEXPECTED" | tr '\n' ' ')"
    say "(these tables should not have changed since the backup - look into it)"
    FAILED=1
  else
    ok "contents match, except $(echo "$CHANGED" | tr '\n' ' ')- those are written to continuously, so they are expected to have moved on since the backup"
  fi
fi

echo ""
if [ -n "$FAILED" ]; then
  echo "VERIFY FAILED - this backup would not restore cleanly. Do not rely on it."
  exit 1
fi
echo "VERIFIED - $(basename "$FILE") restores correctly."

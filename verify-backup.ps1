# Prove that a backup can actually be restored (Windows).
#
#   .\verify-backup.ps1                                            newest backup
#   .\verify-backup.ps1 -File backups\bethesda_2026-07-15_0200.sql.gz
#
# It restores the backup into a temporary database, compares that against the live
# one, and drops the temporary database again. Your data is never written to: the
# only things created and destroyed are a database called bethesda_verify_tmp and
# nothing else.
#
# An untested backup is not a backup. Run this after setting up a clinic, and
# occasionally after that.

param(
  [string]$File = '',
  [string]$TempDb = 'bethesda_verify_tmp'
)

# Not 'Stop': psql writes its NOTICEs to stderr, and PowerShell turns any stderr from a
# native command into a terminating error under 'Stop'. Every docker/psql call below
# checks $LASTEXITCODE explicitly instead.
$ErrorActionPreference = 'Continue'
Set-Location $PSScriptRoot

$DB_CONTAINER = 'bethesda-emr-db'
$DB_USER = 'medconnect'
$DB_NAME = 'medconnect'

function Say([string]$m) { Write-Host "  $m" }
function Step([string]$m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Ok([string]$m)  { Write-Host "  [ok]   $m" -ForegroundColor Green }
function Bad([string]$m) { Write-Host "  [FAIL] $m" -ForegroundColor Red }
function Die([string]$m) { Write-Host ""; Write-Host "ERROR: $m" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- preflight
docker inspect -f '{{.State.Running}}' $DB_CONTAINER 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { Die "The database container ($DB_CONTAINER) is not running. Start the app first." }

if (-not $File) {
  $newest = Get-ChildItem 'backups\bethesda_*.sql.gz' -ErrorAction SilentlyContinue |
            Sort-Object Name | Select-Object -Last 1
  if (-not $newest) { Die "No backups found in .\backups\. Take one from Settings -> Backup first." }
  $File = $newest.FullName
}
if (-not (Test-Path $File)) { Die "No such file: $File" }
$File = (Resolve-Path $File).Path

# The password lives in .env, which is also the only place it should live.
if (-not (Test-Path .env)) { Die "No .env here - run this from the folder the app is installed in." }
$pw = (Select-String -Path .env -Pattern '^DB_PASSWORD=(.*)$').Matches.Groups[1].Value
if (-not $pw) { Die "DB_PASSWORD is not set in .env" }

Write-Host "Verifying $(Split-Path $File -Leaf)"
Say "size $([math]::Round((Get-Item $File).Length / 1KB, 1)) KB, taken $((Get-Item $File).LastWriteTime)"

function Psql([string]$db, [string]$sql) {
  # client_min_messages=warning keeps "NOTICE: database does not exist, skipping" out
  # of the output; it is noise here, not news.
  $out = $sql | docker exec -i -e PGPASSWORD=$pw -e PGOPTIONS='-c client_min_messages=warning' `
                  $DB_CONTAINER psql -v ON_ERROR_STOP=1 -U $DB_USER -d $db -t -A -F'|' 2>$null
  if ($LASTEXITCODE -ne 0) { Die "Query failed against '$db'." }
  return @($out | ForEach-Object { $_ -replace "`r", '' } | Where-Object { $_ -ne '' })
}

# Row counts and per-table checksums, straight out of the catalogue so a table added
# in a later version is picked up without touching this script.
$COUNTS = @"
select table_name,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I','public',table_name), false,true,'')))[1]::text
from information_schema.tables
where table_schema='public' and table_type='BASE TABLE' order by table_name;
"@
$SUMS = @"
select table_name,
       coalesce((xpath('/row/c/text()', query_to_xml(format('select md5(string_agg(t::text, chr(10) order by t::text)) as c from %I.%I t','public',table_name), false,true,'')))[1]::text, 'empty')
from information_schema.tables
where table_schema='public' and table_type='BASE TABLE' order by table_name;
"@
$SEQS = @"
select s.relname, coalesce(pg_sequence_last_value(s.oid)::text,'unused')
from pg_class s join pg_namespace n on n.oid=s.relnamespace
where s.relkind='S' and n.nspname='public' order by s.relname;
"@
$SHAPE = @"
select (select count(*) from pg_indexes where schemaname='public')::text || ' indexes, ' ||
       (select count(*) from information_schema.table_constraints where constraint_schema='public')::text || ' constraints, ' ||
       (select count(*) from information_schema.routines where routine_schema='public')::text || ' routines';
"@
# Every sequence that is behind the largest id already in its own table. A restore that
# loses these looks perfect until the first new patient collides with an existing id --
# and unlike the comparisons further down, this is answerable from the restored database
# alone, so it works for an old backup too.
$BEHIND = @"
select seq.relname || ' is behind ' || tab.relname || '.' || att.attname
from pg_class seq
join pg_depend d on d.objid = seq.oid and d.classid = 'pg_class'::regclass and d.deptype in ('a','i')
join pg_class tab on tab.oid = d.refobjid
join pg_attribute att on att.attrelid = tab.oid and att.attnum = d.refobjsubid
join pg_namespace n on n.oid = seq.relnamespace
where seq.relkind = 'S' and n.nspname = 'public'
  and coalesce(pg_sequence_last_value(seq.oid), 0) <
      coalesce((xpath('/row/c/text()', query_to_xml(format('select max(%I)::text as c from %I.%I', att.attname, 'public', tab.relname), false, true, '')))[1]::text::bigint, 0)
order by 1;
"@

# ---------------------------------------------------------------- restore
Step "Restoring into a temporary database ($TempDb)"
Psql 'postgres' "DROP DATABASE IF EXISTS $TempDb;" | Out-Null
Psql 'postgres' "CREATE DATABASE $TempDb;" | Out-Null

$failed = $false
$skipCompare = $false
try {
  # Copy the file in and unzip it inside the container rather than piping the SQL
  # through PowerShell. Reading it into a string here would re-encode it on the way
  # out, and patient names are not ASCII -- French and Malagasy accents would arrive
  # mangled, which is a horrible thing to discover from a "successful" restore. This
  # also streams, so a multi-gigabyte clinic database does not have to fit in memory.
  #
  # --single-transaction so a broken file leaves nothing behind, ON_ERROR_STOP so a
  # failure is reported instead of scrolling past. Deliberately the same command a
  # real restore uses: the point is to test the procedure, not just the file.
  docker cp "$File" "${DB_CONTAINER}:/tmp/verify-backup.sql.gz" 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { Die "Could not copy the backup into the database container." }

  # Check the archive before feeding it anywhere. A truncated file is the likely kind
  # of damage -- a disk that filled up mid-dump, a USB pulled early -- and it is worth
  # its own message rather than being reported as a hundred mismatched tables.
  docker exec $DB_CONTAINER gunzip -t /tmp/verify-backup.sql.gz 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    docker exec $DB_CONTAINER rm -f /tmp/verify-backup.sql.gz 2>$null | Out-Null
    Bad "the file is not a complete gzip archive - it is truncated or corrupted"
    Die "This backup is damaged and cannot be used. Try an older one."
  }
  Ok "archive is intact"

  # set -o pipefail, and it is not optional: without it the pipeline reports psql's
  # exit code and gunzip's failure disappears. A half-decompressed file would be
  # committed as far as it got and the restore would call itself a success -- which
  # is the exact failure this whole script exists to catch.
  $restoreOut = docker exec -e PGPASSWORD=$pw $DB_CONTAINER sh -c `
    "set -o pipefail; gunzip -c /tmp/verify-backup.sql.gz | psql -v ON_ERROR_STOP=1 --single-transaction -U $DB_USER -d $TempDb" 2>&1
  $restoreCode = $LASTEXITCODE
  docker exec $DB_CONTAINER rm -f /tmp/verify-backup.sql.gz 2>$null | Out-Null

  if ($restoreCode -ne 0) {
    Bad "the backup does not restore"
    Write-Host ($restoreOut | Select-Object -Last 15 | Out-String)
    Die "This backup cannot be restored. Try an older one, and find out why this happened."
  }
  Ok "restored with no errors"

  # ---------------------------------------------------------------- check
  # Is this the backup the live database was most recently dumped from? Only then does
  # it make sense to expect the two to match. Restoring an older one is a perfectly
  # normal thing to do -- it is what you do after losing a day -- and it must not be
  # called a broken backup just because the clinic has seen patients since.
  $newest = Get-ChildItem 'backups\bethesda_*.sql.gz' -ErrorAction SilentlyContinue |
            Sort-Object Name | Select-Object -Last 1
  $isNewest = $newest -and ((Split-Path $File -Leaf) -eq $newest.Name)

  Step "Checking the restored database"
  # @() around the call on purpose: PowerShell unrolls a one-element array on return,
  # so (Psql ...)[0] would index into the *string* and hand back its first character.
  $restoredShape = @(Psql $TempDb $SHAPE)[0]
  Ok "schema: $restoredShape"
  $restoredCounts = Psql $TempDb $COUNTS
  $restoredTotal  = ($restoredCounts | ForEach-Object { [int]($_ -split '\|')[1] } | Measure-Object -Sum).Sum
  Ok "$($restoredCounts.Count) tables, $restoredTotal rows"

  # This one is a real fault in any backup, old or new.
  $behind = @(Psql $TempDb $BEHIND)
  if ($behind.Count -gt 0) {
    Bad "sequences are behind their own data - new records would collide with existing ids:"
    $behind | ForEach-Object { Write-Host "         $_" }
    $failed = $true
  } else {
    Ok "every sequence is ahead of its own data"
  }

  if (-not $isNewest) {
    Write-Host ""
    Say "$(Split-Path $File -Leaf) is not the newest backup, so it is not compared against"
    Say "the live database - it is older, and differing from today's data is what it is for."
    $skipCompare = $true
  }

  # ---------------------------------------------------------------- compare
  if (-not $skipCompare) {
  Step "Comparing against the live database"

  $liveShape = @(Psql $DB_NAME $SHAPE)[0]
  $tmpShape  = @(Psql $TempDb  $SHAPE)[0]
  if ($liveShape -eq $tmpShape) { Ok "schema: $liveShape" }
  else { Bad "schema differs`n         live:    $liveShape`n         restored: $tmpShape"; $failed = $true }

  $liveCounts = Psql $DB_NAME $COUNTS
  $tmpCounts  = Psql $TempDb  $COUNTS
  $diff = Compare-Object $liveCounts $tmpCounts
  $total = ($liveCounts | ForEach-Object { [int]($_ -split '\|')[1] } | Measure-Object -Sum).Sum
  if (-not $diff) { Ok "$($liveCounts.Count) tables, $total rows - counts match" }
  else {
    Bad "row counts differ:"
    $diff | ForEach-Object { Write-Host ("         {0} {1}" -f $_.SideIndicator, $_.InputObject) }
    $failed = $true
  }

  # A restore that loses sequence values looks perfect until the first new record
  # collides with an existing id. This is the check people skip.
  $liveSeqs = Psql $DB_NAME $SEQS
  $tmpSeqs  = Psql $TempDb  $SEQS
  $seqDiff = Compare-Object $liveSeqs $tmpSeqs
  if (-not $seqDiff) { Ok "$($liveSeqs.Count) sequences at the same values" }
  else {
    Bad "sequence values differ - new records would collide after a restore:"
    $seqDiff | ForEach-Object { Write-Host ("         {0} {1}" -f $_.SideIndicator, $_.InputObject) }
    $failed = $true
  }

  $liveSums = Psql $DB_NAME $SUMS
  $tmpSums  = Psql $TempDb  $SUMS
  $sumDiff  = Compare-Object $liveSums $tmpSums
  if (-not $sumDiff) { Ok "every table's contents match" }
  else {
    # The live database keeps moving while the backup stands still, so tables that
    # are written to constantly will differ. That is expected, not a fault.
    $changed = $sumDiff | ForEach-Object { ($_.InputObject -split '\|')[0] } | Sort-Object -Unique
    $expected = @('service_heartbeat', 'document_log', 'worklist_log')
    $unexpected = $changed | Where-Object { $_ -notin $expected }
    if ($unexpected) {
      Bad "contents differ in: $($unexpected -join ', ')"
      Say "(these tables should not have changed since the backup - look into it)"
      $failed = $true
    } else {
      Ok "contents match, except $($changed -join ', ') - those are written to continuously, so they are expected to have moved on since the backup"
    }
  }
  }  # end: compare against live
}
finally {
  Step "Cleaning up"
  Psql 'postgres' "DROP DATABASE IF EXISTS $TempDb;" | Out-Null
  Say "temporary database removed - your data was never touched"
}

Write-Host ""
if ($failed) {
  $why = if ($skipCompare) { "this backup restores, but its contents are not sound." }
         else { "this backup would not restore cleanly. Do not rely on it." }
  Write-Host "VERIFY FAILED - $why" -ForegroundColor Red
  exit 1
}
Write-Host "VERIFIED - $(Split-Path $File -Leaf) restores correctly." -ForegroundColor Green

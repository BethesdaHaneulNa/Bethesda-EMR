# Prove that a backup can actually be restored (Windows).
#
#   .\verify-backup.ps1                                            newest backup
#   .\verify-backup.ps1 -File backups\bethesda_2026-07-15_0200.sql.gz
#   .\verify-backup.ps1 -Strict                  right after "Back up now": exact match
#   .\verify-backup.ps1 -DbContainer bethesda-s-settings-db       a development stack
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
  # The database container to restore into (and compare against). Development
  # stacks have their own; never point a test at the clinic's by accident.
  [string]$DbContainer = 'bethesda-emr-db',
  # The app container whose /backups mount says where the backups really are.
  # Default: the database container's name with -db replaced by -api.
  [string]$ApiContainer = '',
  # Where to look for the newest backup. Default: ask Docker (see ApiContainer),
  # then fall back to the backups folder next to this script.
  [string]$BackupDir = '',
  # Fail on any difference from the live database. Only meaningful straight after
  # a backup was taken, before anyone has entered anything since.
  [switch]$Strict,
  [string]$TempDb = 'bethesda_verify_tmp'
)

# Not 'Stop': psql writes its NOTICEs to stderr, and PowerShell turns any stderr from a
# native command into a terminating error under 'Stop'. Every docker/psql call below
# checks $LASTEXITCODE explicitly instead.
$ErrorActionPreference = 'Continue'
Set-Location $PSScriptRoot

$DB_CONTAINER = $DbContainer
$DB_USER = 'medconnect'
$DB_NAME = 'medconnect'
if (-not $ApiContainer) { $ApiContainer = $DbContainer -replace '-db$', '-api' }

function Say([string]$m) { Write-Host "  $m" }
function Step([string]$m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Ok([string]$m)  { Write-Host "  [ok]   $m" -ForegroundColor Green }
function Bad([string]$m) { Write-Host "  [FAIL] $m" -ForegroundColor Red }
function Info([string]$m) { Write-Host "  [info] $m" -ForegroundColor Yellow }
function Die([string]$m) { Write-Host ""; Write-Host "ERROR: $m" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- preflight
# The output, not only the exit code: inspect succeeds on a stopped container too.
$running = docker inspect -f '{{.State.Running}}' $DB_CONTAINER 2>$null
if ($LASTEXITCODE -ne 0 -or "$running".Trim() -ne 'true') { Die "The database container ($DB_CONTAINER) is not running. Start the app first." }

# The backups are wherever BACKUP_PATH put them - often another drive - not
# necessarily next to this script. Docker knows: it mounted that folder into the
# app as /backups. (The status window finds it the same way.)
if (-not $BackupDir) {
  # Every mount as "destination=source" and pick ours here: a quoted string inside
  # the template does not survive Windows PowerShell's native argument passing.
  $mounts = docker inspect $ApiContainer --format '{{range .Mounts}}{{.Destination}}={{.Source}}{{println}}{{end}}' 2>$null
  if ($LASTEXITCODE -eq 0) {
    foreach ($l in $mounts) {
      $pair = "$l" -split '=', 2
      if ($pair.Count -eq 2 -and $pair[0] -eq '/backups' -and (Test-Path $pair[1])) { $BackupDir = $pair[1] }
    }
  }
  if (-not $BackupDir) { $BackupDir = Join-Path $PSScriptRoot 'backups' }
}
Say "backups: $BackupDir"
function Get-NewestBackup {
  # By name: the name carries the time it was taken; a copy keeps its name but not its date.
  return Get-ChildItem (Join-Path $BackupDir 'bethesda_*.sql.gz') -File -ErrorAction SilentlyContinue |
         Sort-Object Name | Select-Object -Last 1
}

if (-not $File) {
  $newest = Get-NewestBackup
  if (-not $newest) { Die "No backups found in $BackupDir. Take one from Settings -> Backup first." }
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
$strictMismatch = $false
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
  $newest = Get-NewestBackup
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
  #
  # Two different questions, kept apart on purpose:
  #
  #  * Is the backup missing structure? A table the live database has and the
  #    restore does not, or a different schema, is a fault in the backup - unless
  #    the app was updated after the backup was taken, which adds migrations.
  #
  #  * Does the data match? Only if nobody has entered anything since the backup.
  #    The nightly backup is taken at 02:00; by the time anyone runs this, the clinic
  #    has registered patients. This used to be judged a failure - one phrase added
  #    after the backup produced "VERIFY FAILED - Do not rely on it" and a warning
  #    that ids would collide, about a backup that was perfectly good - which teaches
  #    people to ignore the verdict. Now differences are listed, and only -Strict
  #    (run straight after "Back up now") treats them as failure. Soundness on its
  #    own is proven above: a clean single-transaction restore with ON_ERROR_STOP,
  #    and every sequence ahead of its own data.
  if (-not $skipCompare) {
  Step "Comparing against the live database"

  function TableMap($lines) {
    $m = @{}
    foreach ($l in $lines) { $p = $l -split '\|'; $m[$p[0]] = $p[1] }
    return $m
  }
  $liveCounts = Psql $DB_NAME $COUNTS
  $tmpCounts  = Psql $TempDb  $COUNTS
  $liveMap = TableMap $liveCounts
  $tmpMap  = TableMap $tmpCounts

  # Updated since the backup? Each update that changes the schema adds a row here.
  $liveMig = [int]("0" + $liveMap['schema_migrations'])
  $tmpMig  = [int]("0" + $tmpMap['schema_migrations'])
  $updatedSince = $liveMig -gt $tmpMig
  if ($updatedSince) {
    Info "the app was updated after this backup ($($liveMig - $tmpMig) newer database migration(s)), so the schema is expected to differ"
  }

  $missing = @($liveMap.Keys | Where-Object { -not $tmpMap.ContainsKey($_) } | Sort-Object)
  if ($missing.Count -gt 0 -and -not $updatedSince) {
    Bad "tables missing from the backup: $($missing -join ', ')"
    $failed = $true
  } elseif ($missing.Count -eq 0) {
    Ok "all $($liveMap.Count) tables of the live database are in the backup"
  }

  $liveShape = @(Psql $DB_NAME $SHAPE)[0]
  $tmpShape  = @(Psql $TempDb  $SHAPE)[0]
  if ($liveShape -eq $tmpShape) { Ok "schema: $liveShape" }
  elseif ($updatedSince) { Info "schema differs (expected after the update)`n         live:     $liveShape`n         restored: $tmpShape" }
  else { Bad "schema differs`n         live:     $liveShape`n         restored: $tmpShape"; $failed = $true }

  # Tables written continuously by the system itself, not by people. They differ
  # even straight after a backup, so even -Strict does not hold them against it.
  $expected = @('service_heartbeat', 'document_log', 'worklist_log')
  $expected += $expected | ForEach-Object { "${_}_id_seq" }

  $changed = @()
  $countDiff = @(Compare-Object $liveCounts $tmpCounts)
  $countDiff | ForEach-Object { $changed += ($_.InputObject -split '\|')[0] }
  $liveSeqs = Psql $DB_NAME $SEQS
  $tmpSeqs  = Psql $TempDb  $SEQS
  $seqDiff = @(Compare-Object $liveSeqs $tmpSeqs)
  # A sequence can move with no row left to show for it (added, then deleted).
  $seqDiff | ForEach-Object { $changed += ($_.InputObject -split '\|')[0] }
  $liveSums = Psql $DB_NAME $SUMS
  $tmpSums  = Psql $TempDb  $SUMS
  $sumDiff  = @(Compare-Object $liveSums $tmpSums)
  $sumDiff | ForEach-Object { $changed += ($_.InputObject -split '\|')[0] }
  $changed = @($changed | Sort-Object -Unique)
  $byPeople = @($changed | Where-Object { $_ -notin $expected -and $_ -ne 'schema_migrations' })

  if ($changed.Count -eq 0) {
    $total = ($liveCounts | ForEach-Object { [int]($_ -split '\|')[1] } | Measure-Object -Sum).Sum
    Ok "identical to the live database: $($liveCounts.Count) tables, $total rows, every sequence and every table's contents"
  } elseif ($byPeople.Count -eq 0) {
    Ok "identical to the live database, except $($changed -join ', ') - written continuously by the system, so they are expected to have moved on"
  } elseif ($Strict) {
    Bad "differs from the live database in: $($byPeople -join ', ')"
    foreach ($t in $byPeople) {
      if ($liveMap.ContainsKey($t) -and $liveMap[$t] -ne $tmpMap[$t]) {
        Write-Host ("         {0}: live {1} rows, backup {2}" -f $t, $liveMap[$t], $tmpMap[$t])
      }
    }
    Say "(With -Strict nothing may have changed since the backup. If someone was working,"
    Say " take a new backup and run this again straight after it.)"
    $failed = $true
    $strictMismatch = $true
  } else {
    $taken = (Get-Item $File).LastWriteTime.ToString('yyyy-MM-dd HH:mm')
    Info "the live database has changed since this backup was taken ($taken), in: $($byPeople -join ', ')"
    Say "This is normal while the clinic is working and says nothing against the backup."
    Say "For an exact comparison: press Back up now, then run this again with -Strict."
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
         elseif ($strictMismatch) { "this backup restores, but does not match the live database (-Strict)." }
         else { "this backup would not restore cleanly. Do not rely on it." }
  Write-Host "VERIFY FAILED - $why" -ForegroundColor Red
  exit 1
}
Write-Host "VERIFIED - $(Split-Path $File -Leaf) restores correctly." -ForegroundColor Green

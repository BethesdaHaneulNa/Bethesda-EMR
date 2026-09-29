# Remove the test patients from a freshly restored EMR (Windows) - ONE TIME, NEW PC ONLY.
#
#   .\clean-test-data.ps1 -DbContainer bethesda-emr-db -ApiContainer bethesda-emr-api `
#                         -BackupFile backups\bethesda_2026-11-02_0915.sql.gz -DryRun
#   (the same without -DryRun, once the dry run looks right)
#
# Decided 2026-09-29 (option C, wiki/modules/settings.md 2.13): the EMR is moved to the
# new PC by restoring a backup; on the NEW PC only, right after that restore and before
# the first real patient, the patients entered while testing are removed together with
# their visits, consultations, prescriptions, orders, lab results, receipts and
# documents; the test staff accounts (login zz...) are deactivated; the next chart
# number is then YY-00001. Everything else stays: staff, clinic, departments, drugs,
# prices and stock with its record, order codes, lab items and reference ranges,
# phrases, order sets, the imaging settings, and the change log (which nobody can edit).
#
# NEVER RUN THIS ON THE OLD PC. It is meant for a database that is an exact copy of the
# backup it was restored from, and it checks that:
#   * the ids in every table it would empty are exactly the ids in -BackupFile. One
#     record entered after the restore - a real patient - and it stops, deleting nothing;
#   * no table it does not know points at those records (a later version may add one);
#   * an administrator who can open Settings remains after the test accounts go;
#   * it lists the patients and asks you to type DELETE <number of patients>;
#   * it takes a backup first (the same as "Back up now"), then deletes in ONE
#     transaction that counts again before deleting - all of it or nothing.
# There are no default container names on purpose: you say which EMR you mean.
#
# The PC the EMR was prepared on is protected by a file: if KEEP-TEST-DATA.txt is in this
# folder, the script stops before it looks at anything. The checks above cannot tell that
# PC from the new one - its database also equals its newest backup when nothing has been
# entered since. The file is never in git and never in the offline kit, so a new PC does
# not have it.
#
# ASCII only: Windows PowerShell 5.1 reads a script without a BOM in the ANSI code page.

param(
  [Parameter(Mandatory = $true)][string]$DbContainer,
  [Parameter(Mandatory = $true)][string]$ApiContainer,
  # The backup this database was restored from, just now.
  [Parameter(Mandatory = $true)][string]$BackupFile,
  # Do every check and the deletion, then roll it back and show what would remain.
  [switch]$DryRun
)

$ErrorActionPreference = 'Continue'   # native commands are checked by exit code
Set-Location $PSScriptRoot
$DB_USER = 'medconnect'
$DB_NAME = 'medconnect'

function Say([string]$m)  { Write-Host "  $m" }
function Step([string]$m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Ok([string]$m)   { Write-Host "  [ok]   $m" -ForegroundColor Green }
function Stop-Here([string]$m) { Write-Host ""; Write-Host "STOPPED - nothing was deleted. $m" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- not on the PC it was prepared on
$keep = Join-Path $PSScriptRoot 'KEEP-TEST-DATA.txt'
if (Test-Path $keep) {
  Stop-Here ("KEEP-TEST-DATA.txt is in this folder: this is the PC the EMR was prepared on, and its test " +
             "records are kept. This script is for the new PC only.")
}

# ---------------------------------------------------------------- preflight
$running = docker inspect -f '{{.State.Running}}' $DbContainer 2>$null
if ($LASTEXITCODE -ne 0 -or "$running".Trim() -ne 'true') { Stop-Here "The database container '$DbContainer' is not running." }
$running = docker inspect -f '{{.State.Running}}' $ApiContainer 2>$null
if ($LASTEXITCODE -ne 0 -or "$running".Trim() -ne 'true') { Stop-Here "The app container '$ApiContainer' is not running." }
if (-not (Test-Path $BackupFile)) { Stop-Here "No such file: $BackupFile" }
$BackupFile = (Resolve-Path $BackupFile).Path
if (-not (Test-Path .env)) { Stop-Here "No .env here - run this from the folder the app is installed in." }
$pw = (Select-String -Path .env -Pattern '^DB_PASSWORD=(.*)$').Matches.Groups[1].Value
if (-not $pw) { Stop-Here "DB_PASSWORD is not set in .env" }

function Psql([string]$sql) {
  $out = $sql | docker exec -i -e PGPASSWORD=$pw -e PGOPTIONS='-c client_min_messages=warning' `
                  $DbContainer psql -v ON_ERROR_STOP=1 -U $DB_USER -d $DB_NAME -t -A -F'|' 2>&1
  $code = $LASTEXITCODE
  $lines = @($out | ForEach-Object { "$_" -replace "`r", '' } | Where-Object { $_ -ne '' })
  if ($code -ne 0) { $lines | ForEach-Object { Write-Host "         $_" }; Stop-Here "A database query failed." }
  return $lines
}

# The tables that are emptied, children first. Every row in them is a test record once
# the checks below have passed.
$DELETE_ORDER = @('billing_item', 'billing', 'lab_result', 'worklist_log', 'document_log',
                  'order_item', 'prescription', 'diagnosis', 'consultation', 'visit', 'patient')
# The ones whose ids are compared with the backup (the others hang off these).
$COMPARED = @('patient', 'visit', 'consultation', 'billing', 'billing_item', 'prescription',
              'order_item', 'diagnosis', 'lab_result', 'worklist_log', 'document_log')

# ---------------------------------------------------------------- the backup's ids
# Read straight from the dump: the first column of each COPY block is the id.
Step "Reading $(Split-Path $BackupFile -Leaf)"
$inBackup = @{}; foreach ($t in $COMPARED) { $inBackup[$t] = $null }
$patientCols = $null; $patientRows = @()
$fs = $null
try {
  $fs = [IO.File]::OpenRead($BackupFile)
  $gz = New-Object IO.Compression.GZipStream($fs, [IO.Compression.CompressionMode]::Decompress)
  $rd = New-Object IO.StreamReader($gz, [Text.Encoding]::UTF8)
  $cur = $null
  while ($null -ne ($line = $rd.ReadLine())) {
    if ($cur) {
      if ($line -eq '\.') { $cur = $null; continue }
      $cells = $line -split "`t"
      [void]$inBackup[$cur].Add($cells[0])
      if ($cur -eq 'patient') { $patientRows += ,$cells }
      continue
    }
    if ($line -match '^COPY public\.(\w+) \((.*)\) FROM stdin;$' -and $COMPARED -contains $Matches[1]) {
      $cur = $Matches[1]
      $inBackup[$cur] = New-Object System.Collections.ArrayList
      if ($cur -eq 'patient') { $patientCols = $Matches[2] -split ', ' }
    }
  }
  $rd.Dispose()
} catch { Stop-Here "Could not read the backup file: $($_.Exception.Message)" } finally { if ($fs) { $fs.Dispose() } }
if ($null -eq $inBackup['patient']) { Stop-Here "This file has no patient table - is it an EMR backup?" }
Ok "backup read"

# ---------------------------------------------------------------- same records as the backup?
Step "Checking that this database is the backup, unchanged"
$counts = @{}
foreach ($t in $COMPARED) {
  $exists = @(Psql "select (to_regclass('public.$t') is not null)::text;")[0]
  if ($exists -ne 'true') { $counts[$t] = 0; if ($inBackup[$t] -and $inBackup[$t].Count) { Stop-Here "Table $t is in the backup but not in the database." }; continue }
  $ids = @(Psql "select id from $t order by id;")
  $bk = @(); if ($inBackup[$t]) { $bk = @($inBackup[$t]) }
  $added   = @($ids | Where-Object { $bk -notcontains $_ })
  $removed = @($bk  | Where-Object { $ids -notcontains $_ })
  if ($added.Count -gt 0) {
    Stop-Here ("$($added.Count) record(s) in '$t' were entered AFTER this backup - real patients may be here. " +
               "This script is only for a database restored from that backup a moment ago.")
  }
  if ($removed.Count -gt 0) { Stop-Here "$($removed.Count) record(s) of '$t' in the backup are not in the database - it was not restored from this file, or was changed since." }
  $counts[$t] = $ids.Count
}
Ok "every record is exactly the backup's - nothing was entered since the restore"

# Anything else pointing at what we delete? A table added by a later version would
# either block the delete or lose rows by cascade; either way, stop and let a person look.
$DELETE_SET = $DELETE_ORDER
$fks = Psql @"
select conrelid::regclass::text || '|' || confrelid::regclass::text || '|' || confdeltype::text
  from pg_constraint
 where contype = 'f' and confrelid::regclass::text in ('$($DELETE_SET -join "','")');
"@
foreach ($f in $fks) {
  $p = $f -split '\|'
  if ($DELETE_SET -contains $p[0]) { continue }
  if ($p[0] -eq 'stock_movement' -and $p[2] -eq 'n') { continue }   # the stock record keeps its lines; the link is emptied
  Stop-Here "Table '$($p[0])' refers to '$($p[1])' and this script does not know it. Ask the person in charge before going on."
}
Ok "no other table depends on these records (the stock record keeps its lines)"

# Test staff: login ids starting with zz, still active.
$zz = @(Psql "select id || '|' || login_id || '|' || coalesce(name,'') || '|' || role from staff where login_id like 'zz%' and status = 'active' order by login_id;")
$zzIds = @($zz | ForEach-Object { ($_ -split '\|')[0] })
$idList = if ($zzIds.Count) { $zzIds -join ',' } else { '0' }
$admins = @(Psql "select count(*) from staff where status = 'active' and role = 'admin' and 'settings' = any(permissions) and id not in ($idList);")[0]
if ([int]$admins -lt 1) { Stop-Here "No administrator who can open Settings would be left once the test accounts are off." }
Ok "$admins administrator(s) who can open Settings remain"

# ---------------------------------------------------------------- what will happen
Step "What will be removed"
$rx = @(Psql "select count(*) filter (where status = 'dispensed') from prescription;")[0]
Say ("patients {0} - visits {1} - consultations {2} - prescriptions {3} ({4} dispensed) - orders {5}" -f `
     $counts['patient'], $counts['visit'], $counts['consultation'], $counts['prescription'], $rx, $counts['order_item'])
Say ("lab results {0} - imaging worklist {1} - receipts {2} ({3} lines) - documents {4} - diagnoses {5}" -f `
     $counts['lab_result'], $counts['worklist_log'], $counts['billing'], $counts['billing_item'], $counts['document_log'], $counts['diagnosis'])
Write-Host ""
Say "Patients (chart number - name - registered):"
$iChart = [array]::IndexOf($patientCols, 'chart_no'); $iLast = [array]::IndexOf($patientCols, 'last_name')
$iFirst = [array]::IndexOf($patientCols, 'first_name'); $iAt = [array]::IndexOf($patientCols, 'created_at')
foreach ($r in $patientRows) {
  $at = if ($iAt -ge 0) { ($r[$iAt] -split ' ')[0] } else { '' }
  Say ("  {0}  {1} {2}  {3}" -f $r[$iChart], $r[$iLast], $r[$iFirst], $at)
}
Write-Host ""
if ($zz.Count) {
  Say "Test staff accounts to deactivate (they stay in the list as inactive):"
  foreach ($s in $zz) { $p = $s -split '\|'; Say ("  {0}  {1}  ({2})" -f $p[1], $p[2], $p[3]) }
} else { Say "No active test staff accounts (zz...)." }
Write-Host ""
Say "Kept: staff, clinic, departments, drugs, prices, stock and its record, order codes,"
Say "lab items and ranges, phrases, order sets, imaging settings, the change log."

$n = $counts['patient']
if (-not $DryRun) {
  Write-Host ""
  Write-Host "  This is for the NEW PC, right after restoring. Is that where you are?" -ForegroundColor Yellow
  $answer = Read-Host "  Type  DELETE $n  to go on (anything else stops)"
  if ($answer -cne "DELETE $n") { Stop-Here "You did not type DELETE $n." }

  Step "Backing up first"
  $bk = docker exec $ApiContainer node src/services/backup-cli.js before-cleanup 2>&1
  if ($LASTEXITCODE -ne 0) { Stop-Here "The backup failed: $bk" }
  Ok "backup $bk (restore it if you need these records back)"
}

# ---------------------------------------------------------------- one transaction
Step $(if ($DryRun) { "Dry run: deleting inside a transaction, then rolling back" } else { "Deleting (one transaction)" })
$expect = ($COMPARED | ForEach-Object { "(select count(*) from $_) <> $($counts[$_])" }) -join ' or '
$deletes = ($DELETE_ORDER | ForEach-Object { "delete from $_;" }) -join "`n"
$staffSql = ''
if ($zzIds.Count) {
  $staffSql = @"
insert into audit_log (staff_name, module, action, entity, entity_id, summary, before_value, after_value)
select 'clean-test-data.ps1', 'settings', 'settings.staff.edit', 'staff', id::text, name || ' (' || login_id || ')',
       '{"status":"active"}'::jsonb, '{"status":"inactive"}'::jsonb
  from staff where id in ($idList);
update staff set status = 'inactive', updated_at = now() where id in ($idList);
"@
}
$sql = @"
begin;
lock table $($COMPARED -join ', ') in share row exclusive mode;
do `$`$ begin
  if $expect then raise exception 'records changed since the check - nothing deleted'; end if;
end `$`$;
update billing set carried_into_id = null;
$deletes
$staffSql
select setval('document_no_seq', 1, false);
select 'left|' || (select count(*) from patient) || '|' || (select count(*) from visit) || '|' || (select count(*) from billing)
       || '|' || (select count(*) from staff where status = 'active') || '|' || generate_chart_no();
$(if ($DryRun) { 'rollback;' } else { 'commit;' })
"@
$res = @(Psql $sql)
$left = @($res | Where-Object { $_ -like 'left|*' })[0] -split '\|'
Ok ("left: patients {0}, visits {1}, receipts {2}; active staff {3}; next chart number {4}" -f $left[1], $left[2], $left[3], $left[4], $left[5])

Write-Host ""
if ($DryRun) {
  Write-Host "DRY RUN - nothing was changed. Run again without -DryRun to do it." -ForegroundColor Yellow
  exit 0
}
Write-Host "DONE - the test patients are gone." -ForegroundColor Green
Say "Next:"
Say " - Stock: test dispensing reduced some stock. Count the shelves and enter the real"
Say "   figures in Pharmacie > Stock (inventaire); the stock record keeps every line."
Say " - The Journal (change log) keeps the lines from testing - nobody can remove them."
Say " - Settings > Backup > Back up now, so the newest backup is the cleaned database."

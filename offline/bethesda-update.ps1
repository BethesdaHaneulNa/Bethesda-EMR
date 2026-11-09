# Mise à jour Bethesda - one double-click on the desktop updates the EMR (and the PACS when
# the kit carries it) on the clinic's server, with no one from the project present.
#
# What it does, in this order (the same steps that were done by hand for 1.7.2 and 1.7.3):
#   1. Is Docker up? If not: say so and stop (it never starts Docker Desktop itself - see
#      DEPLOYMENT.md section 3 on why a script must not).
#   2. Read the version that runs (GET /api/health) and the newest kit on offer: latest.json
#      at a fixed address on the internet, or, when that cannot be reached, a kit on a USB
#      stick (bethesda-offline-kit-v*.zip with its .sha256 beside it).
#   3. Same version or older: "Déjà à jour", stop.
#   4. Ask, in French and Korean: version X available, the EMR stops for about 30 s, install?
#   5. Download (or copy from the stick) to C:\Temp\bethesda-update\<version>\, check the size
#      and the SHA256 - any difference stops everything.
#   6. Back the database up (backup-cli, the same backup the update scripts take).
#   7. Run the kit's install-offline.ps1 -Update (with -NoPacs when the kit has no PACS; a kit
#      with PACS starts it with setup.ps1 -Offline, which never builds).
#   8. Wait for /api/health to answer with the new version.
#   9. Show the result, large, in French and Korean. A small progress window (steps, percent
#      while downloading, a moving bar while installing) stays up the whole time; the console
#      is hidden - a French Windows console font has no Korean glyphs. Everything is also written to
#      <EMR folder>\logs\update-<date>.txt.
#
# Run by the desktop shortcut "Mise à jour Bethesda" (desktop-shortcut.ps1 makes it):
#   powershell -NoProfile -ExecutionPolicy Bypass -File <EMR folder>\offline\bethesda-update.ps1
# No administrator rights are needed. The kit's own install-offline.ps1 does the install, so
# this script never touches the database, .env or the backups itself; on any failure the data
# is as it was and the message names the last backup.
#
# Where latest.json lives is the default of -LatestUrl below (the newest GitHub Release of the
# project; GitHub redirects that address to the release's file, and Invoke-WebRequest and
# WebRequest follow redirects). A file update-source.json beside the EMR's .env
# ({"latest_url": "..."}) overrides it without touching this script.
#
# For a test without touching the install: -DryRun (stops after the backup and says what it
# would run), -Yes (no questions), -LatestUrl file:///C:/somewhere/latest.json.

param(
  [string]$EmrDir = '',
  [string]$LatestUrl = 'https://github.com/BethesdaHaneulNa/Bethesda-EMR/releases/latest/download/latest.json',
  [switch]$DryRun,
  [switch]$Yes,
  [switch]$NoGui
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# ---------------------------------------------------------------- where things are
if (-not $EmrDir) { $EmrDir = Split-Path -Parent $PSScriptRoot }      # offline\ is inside the EMR folder
$EmrDir = (Resolve-Path -LiteralPath $EmrDir).Path
$installRoot = Split-Path -Parent $EmrDir                                # C:\ for C:\Bethesda-EMR
$logDir = Join-Path $EmrDir 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$log = Join-Path $logDir "update-$stamp.txt"
Start-Transcript -Path $log -Force | Out-Null
$work = Join-Path $env:SystemDrive 'Temp\bethesda-update'

$override = Join-Path $EmrDir 'update-source.json'
if (Test-Path -LiteralPath $override) {
  try { $o = Get-Content -LiteralPath $override -Raw | ConvertFrom-Json; if ($o.latest_url) { $LatestUrl = [string]$o.latest_url } } catch { }
}

# ---------------------------------------------------------------- messages (FR first, KO under it)
function Both([string]$fr, [string]$ko) { return "$fr`n`n$ko" }
$gui = -not $NoGui
if ($gui) { try { Add-Type -AssemblyName System.Windows.Forms | Out-Null; Add-Type -AssemblyName System.Drawing | Out-Null } catch { $gui = $false } }
# The console window is hidden while the GUI runs: a French Windows console font has no
# Korean glyphs (the Korean lines showed as boxes, 1.7.6 at the clinic) and a visible
# console invites someone to close it mid-install. The transcript still records everything.
if ($gui) {
  try {
    Add-Type -Name Win -Namespace BU -MemberDefinition '[DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow(); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);'
    $h = [BU.Win]::GetConsoleWindow(); if ($h -ne [IntPtr]::Zero) { [BU.Win]::ShowWindow($h, 0) | Out-Null }
  } catch { }
}
# One small progress window for the whole run: step (FR / KO), a bar (percent while
# downloading, moving while installing) and "do not close". Closing it is refused while
# the update runs. Nothing here blocks: the script pumps the window between steps.
$PW = $null
function Progress-Open {
  if (-not $gui) { return }
  $f = New-Object Windows.Forms.Form
  $f.Text = 'Mise à jour Bethesda / 업데이트'; $f.Size = New-Object Drawing.Size(520, 190); $f.StartPosition = 'CenterScreen'
  $f.FormBorderStyle = 'FixedDialog'; $f.MaximizeBox = $false; $f.MinimizeBox = $false; $f.TopMost = $true
  $f.Font = New-Object Drawing.Font('Segoe UI', 10)
  $l1 = New-Object Windows.Forms.Label; $l1.Location = New-Object Drawing.Point(16, 14); $l1.Size = New-Object Drawing.Size(480, 46); $l1.Font = New-Object Drawing.Font('Segoe UI', 11, [Drawing.FontStyle]::Bold)
  $bar = New-Object Windows.Forms.ProgressBar; $bar.Location = New-Object Drawing.Point(16, 66); $bar.Size = New-Object Drawing.Size(472, 22); $bar.Minimum = 0; $bar.Maximum = 100
  $l2 = New-Object Windows.Forms.Label; $l2.Location = New-Object Drawing.Point(16, 94); $l2.Size = New-Object Drawing.Size(480, 22); $l2.ForeColor = [Drawing.Color]::DimGray
  $l3 = New-Object Windows.Forms.Label; $l3.Location = New-Object Drawing.Point(16, 122); $l3.Size = New-Object Drawing.Size(480, 22); $l3.ForeColor = [Drawing.Color]::Firebrick
  $l3.Text = 'Ne fermez pas cette fenêtre.  /  이 창을 닫지 마세요.'
  $f.Controls.AddRange(@($l1, $bar, $l2, $l3))
  $f.Tag = @{ busy = $true }
  $f.Add_FormClosing({ param($o, $e) if ($o.Tag.busy) { $e.Cancel = $true } })
  $f.Show() | Out-Null; [Windows.Forms.Application]::DoEvents()
  $script:PW = @{ form = $f; step = $l1; bar = $bar; sub = $l2 }
}
function Progress-Step([string]$fr, [string]$ko, [switch]$Marquee) {
  Say ("== " + $fr)
  if (-not $PW) { return }
  $PW.step.Text = "$fr`n$ko"; $PW.sub.Text = ''
  if ($Marquee) { $PW.bar.Style = 'Marquee'; $PW.bar.MarqueeAnimationSpeed = 30 } else { $PW.bar.Style = 'Continuous'; $PW.bar.Value = 0 }
  [Windows.Forms.Application]::DoEvents()
}
function Progress-Value([int]$pct, [string]$sub) {
  if (-not $PW) { return }
  if ($PW.bar.Style -ne 'Continuous') { $PW.bar.Style = 'Continuous' }
  $PW.bar.Value = [math]::Max(0, [math]::Min(100, $pct)); $PW.sub.Text = $sub
  [Windows.Forms.Application]::DoEvents()
}
function Progress-Pump { if ($PW) { [Windows.Forms.Application]::DoEvents() } }
function Progress-Close { if ($PW) { try { $PW.form.Tag.busy = $false; $PW.form.Close(); $PW.form.Dispose() } catch { }; $script:PW = $null } }
function Say([string]$m) { Write-Host $m }
function Show([string]$title, [string]$text, [string]$kind) {
  # kind: info | warn | error. Always to the console (the log has it); a window when there is a desktop.
  Say ''; Say ("==== " + $title); Say $text; Say ''
  if (-not $gui -or $env:BU_TEST_NOBOX) { return }   # BU_TEST_NOBOX: tests run the window without a blocking box
  $icon = switch ($kind) { 'error' { [Windows.Forms.MessageBoxIcon]::Error } 'warn' { [Windows.Forms.MessageBoxIcon]::Warning } default { [Windows.Forms.MessageBoxIcon]::Information } }
  if ($PW) { $PW.form.TopMost = $false }
  [Windows.Forms.MessageBox]::Show($text, $title, [Windows.Forms.MessageBoxButtons]::OK, $icon, [Windows.Forms.MessageBoxDefaultButton]::Button1, [Windows.Forms.MessageBoxOptions]::DefaultDesktopOnly) | Out-Null
}
function Ask([string]$title, [string]$text) {
  Say ''; Say ("==== " + $title); Say $text
  if ($Yes) { Say '(-Yes: oui)'; return $true }
  if (-not $gui) { $a = Read-Host 'Installer ? (oui / non)'; return ($a -match '^(o|oui|y|yes)$') }
  $r = [Windows.Forms.MessageBox]::Show($text, $title, [Windows.Forms.MessageBoxButtons]::YesNo, [Windows.Forms.MessageBoxIcon]::Question, [Windows.Forms.MessageBoxDefaultButton]::Button2)
  return ($r -eq [Windows.Forms.DialogResult]::Yes)
}
function Stop-Here([int]$code) { Progress-Close; try { Stop-Transcript | Out-Null } catch { }; exit $code }
function Fail([string]$fr, [string]$ko) {
  $last = Last-Backup
  $tail = ''
  if ($last) { $tail = "`n`nDernière sauvegarde / 마지막 백업 :`n$last" }
  Show 'Mise à jour Bethesda - échec / 실패' ((Both $fr $ko) + $tail + "`n`nJournal / 기록 : $log") 'error'
  Stop-Here 1
}
function Last-Backup {
  $cands = @()
  foreach ($d in @((Join-Path $EmrDir 'backups'), (Join-Path $EmrDir '_pre-update-backups'))) {
    if (Test-Path -LiteralPath $d) { $cands += Get-ChildItem -LiteralPath $d -File -Filter '*.sql.gz' -ErrorAction SilentlyContinue }
  }
  $f = $cands | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($f) { return $f.FullName } else { return '' }
}

Say "Mise à jour Bethesda  $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
Say "EMR: $EmrDir   source: $LatestUrl"

# ---------------------------------------------------------------- 1. Docker
docker version --format '{{.Server.Version}}' 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Show 'Mise à jour Bethesda' (Both "Docker n'est pas démarré. Attendez que Docker démarre (icône de la baleine en bas à droite), ou redémarrez le PC, puis relancez." "Docker가 켜져 있지 않습니다. Docker가 뜰 때까지 기다리거나(오른쪽 아래 고래 아이콘) PC를 다시 시작한 뒤 다시 실행하세요.") 'warn'
  Stop-Here 2
}

# ---------------------------------------------------------------- 2. versions
$port = 9080
$compose = Join-Path $EmrDir 'docker-compose.yml'
if (Test-Path -LiteralPath $compose) {
  $m = Select-String -LiteralPath $compose -Pattern '"(\d+):80"' | Select-Object -First 1
  if ($m) { $port = [int]$m.Matches[0].Groups[1].Value }
}
$current = ''
try { $h = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 8; $current = [string]$h.version } catch { }
if (-not $current) {
  Fail "L'EMR ne répond pas sur le port $port, impossible de lire sa version. Rien n'a été changé. Si l'EMR vient de démarrer, attendez une minute et relancez." "EMR이 $port 포트에서 응답하지 않아 버전을 읽을 수 없습니다. 아무것도 바꾸지 않았습니다. 방금 켜졌다면 1분 뒤 다시 실행하세요."
}
Say "version en service: $current"

# The offer: latest.json on the internet, else a kit on a removable drive.
$latest = $null; $from = ''
try {
  # A fresh copy every time: a storage edge may cache the file and ignore the request's
  # Cache-Control (a clinic once saw the old version as "up to date" for an hour after a
  # new one was published), so the address gets a changing query string too.
  $freshUrl = $LatestUrl + $(if ($LatestUrl.IndexOf('?') -ge 0) { '&' } else { '?' }) + 't=' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $resp = Invoke-WebRequest -Uri $freshUrl -TimeoutSec 20 -UseBasicParsing -Headers @{ 'Cache-Control' = 'no-cache' }
  # A release asset comes as application/octet-stream, and Windows PowerShell then hands
  # back bytes instead of text.
  $body = $resp.Content
  if ($body -is [byte[]]) { $body = [Text.Encoding]::UTF8.GetString($body).TrimStart([char]0xFEFF) }
  $latest = $body | ConvertFrom-Json
  Say ('latest.json: Date=' + $resp.Headers['Date'] + ' Age=' + $resp.Headers['Age'] + ' Cache-Control=' + $resp.Headers['Cache-Control'])
  $from = 'internet'
} catch { Say "latest.json injoignable ($($_.Exception.Message)) - je regarde les clés USB." }
if (-not $latest) {
  $kits = @()
  foreach ($dr in (Get-CimInstance Win32_LogicalDisk -ErrorAction SilentlyContinue | Where-Object { $_.DriveType -eq 2 })) {
    $kits += Get-ChildItem -LiteralPath ($dr.DeviceID + '\') -Filter 'bethesda-offline-kit-v*.zip' -File -ErrorAction SilentlyContinue
  }
  $pick = $kits | ForEach-Object {
    if ($_.Name -match 'v(\d+\.\d+\.\d+)') { [pscustomobject]@{ v = [version]$Matches[1]; f = $_ } }
  } | Sort-Object v -Descending | Select-Object -First 1
  if ($pick) {
    $shaFile = $pick.f.FullName + '.sha256'
    if (-not (Test-Path -LiteralPath $shaFile)) { Fail "Kit trouvé sur la clé ($($pick.f.Name)) mais sans fichier .sha256 à côté : je ne peux pas vérifier qu'il est entier. Rien n'a été changé." "USB에 묶음($($pick.f.Name))은 있지만 옆에 .sha256 파일이 없어 온전한지 확인할 수 없습니다. 아무것도 바꾸지 않았습니다." }
    $sha = ((Get-Content -LiteralPath $shaFile -Raw) -split '\s+')[0]
    $hasPacs = $false
    try { Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null; $z = [IO.Compression.ZipFile]::OpenRead($pick.f.FullName); $hasPacs = [bool]($z.Entries | Where-Object { $_.FullName -like 'Bethesda-PACS/*' } | Select-Object -First 1); $z.Dispose() } catch { }
    $latest = [pscustomobject]@{ version = $pick.v.ToString(); url = $pick.f.FullName; size = $pick.f.Length; sha256 = $sha; pacs = $hasPacs; restarts_api = $true; notes_fr = '' }
    $from = 'usb'
  }
}
if (-not $latest) {
  Show 'Mise à jour Bethesda' (Both "Pas d'internet et pas de kit sur une clé USB : rien à installer pour le moment. L'EMR continue en version $current." "인터넷도 안 되고 USB에 묶음도 없어 지금은 설치할 것이 없습니다. EMR은 $current 그대로입니다.") 'warn'
  Stop-Here 3
}
$newV = [version]$latest.version; $curV = [version]$current
Say "version proposée: $newV ($from)"
if ($newV -le $curV) {
  Show 'Mise à jour Bethesda' (Both "Déjà à jour : version $current." "이미 최신입니다: $current.") 'info'
  Stop-Here 0
}

# ---------------------------------------------------------------- 4. ask
$restart = $true; if ($latest.PSObject.Properties['restarts_api'] -and -not $latest.restarts_api) { $restart = $false }
$stopFr = 'les écrans se figent quelques secondes'; $stopKo = '화면이 몇 초 멈춥니다'
if ($restart) { $stopFr = "l'EMR s'arrête environ 30 secondes"; $stopKo = 'EMR이 약 30초 멈춥니다' }
$notes = ''; if ($latest.PSObject.Properties['notes_fr'] -and $latest.notes_fr) { $notes = "`n`n" + [string]$latest.notes_fr }
$sizeMb = [math]::Round(([double]$latest.size) / 1MB, 1)
if (-not (Ask 'Mise à jour Bethesda' ((Both "Version $newV disponible (en service : $current) - $sizeMb Mo.`nPendant l'installation, $stopFr. Personne ne doit être en train d'enregistrer un dossier.`n`nInstaller maintenant ?" "새 버전 $newV 있음(지금 $current) - $sizeMb MB.`n설치하는 동안 $stopKo. 아무도 저장 중이 아닐 때 하세요.`n`n지금 설치할까요?") + $notes))) {
  Say 'annulé par l''utilisateur'; Stop-Here 0
}

# ---------------------------------------------------------------- 5. get the kit, prove it whole
Progress-Open
$dir = Join-Path $work $newV.ToString()
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$zip = Join-Path $dir ("bethesda-offline-kit-v" + $newV + ".zip")
$total = [int64]$latest.size
function Fetch-WithProgress([string]$src, [string]$dst, [int64]$expected) {
  # Chunked copy from any URL (http, https, file:) so the bar can move: percent and
  # "received / total MB" every ~0.3 s. Invoke-WebRequest showed nothing for minutes.
  $req = [Net.WebRequest]::Create($src); $req.Timeout = 60000
  $resp = $req.GetResponse(); $in = $resp.GetResponseStream()
  if ($expected -le 0 -and $resp.ContentLength -gt 0) { $expected = $resp.ContentLength }
  $out = [IO.File]::Create($dst)
  try {
    $buf = New-Object byte[] 262144; $got = [int64]0; $lastUi = [DateTime]::MinValue
    while (($n = $in.Read($buf, 0, $buf.Length)) -gt 0) {
      $out.Write($buf, 0, $n); $got += $n
      if (([DateTime]::Now - $lastUi).TotalMilliseconds -gt 300) {
        $lastUi = [DateTime]::Now
        $pct = if ($expected -gt 0) { [int](100 * $got / $expected) } else { 0 }
        Progress-Value $pct ("{0} %  -  {1:N1} / {2:N1} Mo" -f $pct, ($got / 1MB), ($expected / 1MB))
      }
    }
    Progress-Value 100 ("{0:N1} Mo" -f ($got / 1MB))
  } finally { $out.Dispose(); $in.Dispose(); $resp.Dispose() }
}
if ($from -eq 'usb') {
  Progress-Step 'Copie depuis la clé USB…' 'USB에서 복사 중…'
  Say "copie depuis la clé: $($latest.url)"
  Fetch-WithProgress ([uri]$latest.url).AbsoluteUri $zip $total
} else {
  Progress-Step ("Téléchargement de la version $newV…") ("새 버전 $newV 내려받는 중…")
  Say "téléchargement: $($latest.url)"
  try { Fetch-WithProgress $latest.url $zip $total }
  catch { Fail "Le téléchargement a échoué ($($_.Exception.Message)). Rien n'a été changé. Réessayez plus tard ou utilisez une clé USB." "내려받기에 실패했습니다($($_.Exception.Message)). 아무것도 바꾸지 않았습니다. 나중에 다시 하거나 USB를 쓰세요." }
}
Progress-Step 'Vérification du fichier (taille, SHA256)…' '파일 확인 중(크기·SHA256)…' -Marquee
$len = (Get-Item -LiteralPath $zip).Length
if ([int64]$latest.size -gt 0 -and $len -ne [int64]$latest.size) { Fail "Le fichier reçu n'a pas la taille annoncée ($len au lieu de $($latest.size)). Rien n'a été changé." "받은 파일 크기가 다릅니다($len, 기대 $($latest.size)). 아무것도 바꾸지 않았습니다." }
$hash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLower()
if ($hash -ne ([string]$latest.sha256).ToLower()) { Fail "L'empreinte SHA256 du fichier ne correspond pas : il est abîmé ou ce n'est pas le bon. Rien n'a été changé." "파일의 SHA256이 맞지 않습니다. 손상됐거나 다른 파일입니다. 아무것도 바꾸지 않았습니다." }
Say "kit vérifié: $len octets, sha256 $hash"

Progress-Step 'Décompression…' '압축 푸는 중…' -Marquee
$kit = Join-Path $dir 'kit'
if (Test-Path -LiteralPath $kit) { Remove-Item -LiteralPath $kit -Recurse -Force }
Expand-Archive -LiteralPath $zip -DestinationPath $kit -Force
$installer = Get-ChildItem -LiteralPath $kit -Filter 'install-offline.ps1' -Recurse | Select-Object -First 1
if (-not $installer) { Fail "Le kit ne contient pas install-offline.ps1. Rien n'a été changé." "묶음 안에 install-offline.ps1이 없습니다. 아무것도 바꾸지 않았습니다." }
$kitDir = $installer.DirectoryName
$kitHasPacs = Test-Path -LiteralPath (Join-Path $kitDir 'Bethesda-PACS')
$pacsInstalled = Test-Path -LiteralPath (Join-Path $installRoot 'Bethesda-PACS\.env')
$noPacs = -not ($kitHasPacs -and $pacsInstalled)
Say "kit: $kitDir   PACS dans le kit: $kitHasPacs   PACS installé: $pacsInstalled   -NoPacs: $noPacs"

# ---------------------------------------------------------------- 6. backup
Progress-Step 'Sauvegarde de la base de données…' 'DB 백업 중…' -Marquee
Say 'sauvegarde de la base (backup-cli)...'
$bk = docker exec bethesda-emr-api node src/services/backup-cli.js update 2>&1
$bk | ForEach-Object { Say "  $_" }
if ($LASTEXITCODE -ne 0) { Fail "La sauvegarde de la base a échoué : la mise à jour est annulée, rien n'a été changé." "DB 백업에 실패해 갱신을 중단했습니다. 아무것도 바꾸지 않았습니다." }

if ($DryRun) {
  Show 'Mise à jour Bethesda - essai' (Both "Essai seulement : je m'arrête ici. J'aurais lancé :`n$($installer.FullName) -Update -InstallRoot $installRoot$(if ($noPacs) { ' -NoPacs' })" "시험 모드: 여기서 멈춥니다. 실행했을 명령은 위와 같습니다.") 'info'
  Stop-Here 0
}

# ---------------------------------------------------------------- 7. install
Progress-Step "Installation de la version $newV (environ 30 s)…" "설치 중(약 30초)…" -Marquee
Say 'installation...'
$argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $installer.FullName, '-Update', '-InstallRoot', $installRoot)
if ($noPacs) { $argList += '-NoPacs' }
# The installer's own words go to two files beside this log and are copied into it: a
# -NoNewWindow child's output never reaches Start-Transcript, so a failure left no trace
# of why (first clinic run, 2026-11-08).
$instOut = Join-Path $logDir "install-$stamp.out.txt"; $instErr = Join-Path $logDir "install-$stamp.err.txt"
$p = Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -WorkingDirectory $kitDir -PassThru -NoNewWindow -RedirectStandardOutput $instOut -RedirectStandardError $instErr
# Windows PowerShell 5.1 forgets the exit code of a process started without -Wait unless its
# handle was touched first; 1.7.8 at the clinic ended as "échec" with an empty code after a
# successful install. Touch the handle, then WaitForExit() before reading ExitCode.
$null = $p.Handle
while (-not $p.HasExited) { Progress-Pump; Start-Sleep -Milliseconds 200 }
$p.WaitForExit()
$exitCode = $p.ExitCode
foreach ($f in @($instOut, $instErr)) { if (Test-Path -LiteralPath $f) { Get-Content -LiteralPath $f -Encoding OEM -ErrorAction SilentlyContinue | ForEach-Object { Say "  | $_" } } }   # the child writes in the OEM code page
# docker compose prints its progress (Recreate / Started) on stderr, so the .err.txt file
# is full even when all went well; say so inside it rather than let the name alarm anyone.
if ($exitCode -eq 0 -and (Test-Path -LiteralPath $instErr)) { Add-Content -LiteralPath $instErr -Value "`n[bethesda-update] exit 0 - the lines above are docker compose progress, not errors / 위 줄들은 docker compose 진행 표시이고 오류가 아닙니다" -Encoding UTF8 }
# Older downloads are not needed once a newer kit has been installed: keep this one and
# the one before it (a return to the previous version is a reinstall from its folder).
try {
  Get-ChildItem -LiteralPath $work -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^\d+\.\d+\.\d+$' } |
    Sort-Object { [version]$_.Name } -Descending | Select-Object -Skip 2 | ForEach-Object { Say "nettoyage: $($_.FullName)"; Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
} catch { }
if ($null -eq $exitCode) { Say 'install-offline.ps1: exit code unknown - deciding by /api/health' } elseif ($exitCode -ne 0) { Fail "install-offline.ps1 s'est arrêté avec le code $exitCode. Si l'EMR ne répond plus, restaurez la dernière sauvegarde (DEPLOYMENT.md 5b) ou appelez le support." "install-offline.ps1이 코드 $exitCode로 멈췄습니다. EMR이 안 열리면 마지막 백업으로 복원(DEPLOYMENT.md 5b)하거나 지원을 부르세요." }

# ---------------------------------------------------------------- 8. verify
Progress-Step 'Vérification finale (redémarrage de l''EMR)…' '최종 확인 중(EMR 재시작)…' -Marquee
$got = ''
for ($i = 0; $i -lt 45; $i++) {
  Progress-Pump
  try { $h = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 4; $got = [string]$h.version; if ($got -eq $newV.ToString()) { break } } catch { }
  Start-Sleep -Seconds 2
}
if ($got -ne $newV.ToString()) {
  # A kit without the backend image leaves /api/health at the older backend version on
  # purpose (OFFLINE-INSTALL.md section 4); the installer said 0, so say so rather than fail.
  if ($got) { Show 'Mise à jour Bethesda' (Both "Installation terminée (code 0), mais /api/health annonce $got et non $newV. Si ce kit ne contenait pas le serveur (frontend seulement), c'est normal. Sinon, appelez le support." "설치는 끝났지만(코드 0) /api/health가 $newV 대신 $got 입니다. 이 묶음에 서버가 없었다면(frontend만) 정상입니다. 아니면 지원을 부르세요.") 'warn'; Stop-Here 0 }
  Fail "L'EMR ne répond plus après l'installation. Restaurez la dernière sauvegarde (DEPLOYMENT.md 5b) ou appelez le support." "설치 뒤 EMR이 응답하지 않습니다. 마지막 백업으로 복원(DEPLOYMENT.md 5b)하거나 지원을 부르세요."
}
# Desktop icons changed by this update show up only after the icon cache is rebuilt
# (1.7.6 at the clinic: the new update icon appeared only after ie4uinit -show).
try { Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\ie4uinit.exe') -ArgumentList '-show' -WindowStyle Hidden -Wait -ErrorAction Stop } catch { }
Progress-Close
Show 'Mise à jour Bethesda - terminé / 완료' (Both "Bethesda EMR est maintenant en version $got. Vous pouvez reprendre le travail." "Bethesda EMR이 $got 버전으로 갱신됐습니다. 계속 쓰셔도 됩니다.") 'info'
Stop-Here 0

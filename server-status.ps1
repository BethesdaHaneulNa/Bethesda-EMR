# Bethesda EMR - server status window
#
# Shows, on the machine that runs the clinic, whether the system is working.
#
# This deliberately checks the host directly (Docker, the disk, the backup
# folder, the bridge's heartbeat file) instead of asking the EMR's own status
# API. The API needs a login, and the moment we most need this window is the
# moment nobody can log in -- a status screen that goes blank exactly when the
# server breaks is worse than no status screen, because it looks reassuringly
# absent rather than alarming.
#
#   .\server-status.ps1              window, in French
#   .\server-status.ps1 -Lang ko     window, in Korean
#   .\server-status.ps1 -Console     print once and exit (for checking by hand)

param(
  [ValidateSet('fr', 'en', 'ko')][string]$Lang = 'fr',
  [switch]$Console
)

$ErrorActionPreference = 'Stop'
$RefreshSeconds = 15

# How old a signal is allowed to get before we call it a failure. The bridge
# reports every 15s, so a minute of silence is an outage rather than a slow
# cycle. Backups run nightly, so a day and a half of silence means one was
# missed.
$BridgeStaleSeconds = 60
$BackupStaleHours   = 36
$DiskWarnFreeGb     = 20
$DiskDownFreeGb     = 5

$Containers = @(
  @{ Name = 'bethesda-emr-db';            Key = 'db';       Required = $true  },
  @{ Name = 'bethesda-emr-api';           Key = 'api';      Required = $true  },
  @{ Name = 'bethesda-emr-web';           Key = 'web';      Required = $true  },
  @{ Name = 'bethesda-pacs';              Key = 'pacs';     Required = $false },
  @{ Name = 'bethesda-worklist-bridge';   Key = 'bridge';   Required = $false }
)

# Written for whoever is sitting at the machine, not for whoever wrote it.
# "Container unhealthy" tells a nurse nothing; "patient records are not
# responding" tells them what has stopped and what to say on the phone.
$T = @{
  fr = @{
    title = 'Bethesda EMR - etat du serveur'
    allOk = 'TOUT FONCTIONNE'
    someWarn = 'A SURVEILLER'
    someDown = 'PROBLEME'
    dockerDown = "Docker n'est pas demarre. Ouvrez Docker Desktop, puis relancez le systeme."
    checkedAt = 'Derniere verification :'
    everyN = 'Verification automatique toutes les {0} secondes.'
    dontClose = 'Ne fermez pas cette fenetre.'
    langBtn = 'English'
    db = 'Dossiers patients (base de donnees)'
    api = 'Serveur de l''application'
    web = 'Ecran de l''EMR'
    pacs = 'Imagerie (PACS)'
    bridge = 'Liste de travail des appareils'
    disk = 'Espace disque'
    backup = 'Sauvegarde'
    stOk = 'OK'
    stStopped = 'ARRETE'
    stStarting = 'DEMARRAGE'
    stUnhealthy = 'NE REPOND PAS'
    stNoPort = 'INACCESSIBLE'
    stMissing = 'ABSENT'
    stOff = 'non installe'
    diskFree = '{0} Go libres sur {1} Go'
    backupAge = 'il y a {0} h ({1})'
    backupNone = 'aucune sauvegarde trouvee'
    bridgeAge = 'signal il y a {0} s'
    bridgeSilent = 'aucun signal depuis {0} min'
    adviceDown = 'Prevenez le responsable. Notez ce qui est en rouge ci-dessus.'
    adviceDisk = 'Le disque est presque plein. Prevenez le responsable.'
    adviceBackup = 'La sauvegarde de cette nuit n''a pas eu lieu. Prevenez le responsable.'
    portClosed = 'port {0} ferme'
    portReserved = 'port {0} bloque par Windows'
    advicePort = 'Windows bloque un port (ligne en rouge). Prevenez le responsable : DEPLOYMENT.md, partie Windows.'
    pacsAddr = 'Adresses de l''imagerie (Parametres)'
    notPaired = 'visionneuse non appairee'
    advicePair = 'La visionneuse n''est pas appairee au serveur d''images : lancez pair-with-emr dans le dossier PACS (guide PACS 6.1).'
    stFix = 'A CORRIGER'
    oldPort = 'ancien port {0} -> {1}'
    adviceAddr = 'Ancienne adresse dans Parametres > Flux d''ordres : remplacez 8090 par 9090 et 8080 par 9080, puis enregistrez.'
    backupOldVersion = 'plus ancienne que l''application ({0} mise(s) a jour de la base manquante(s)) - {1}'
    adviceBackupOld = 'La derniere sauvegarde date d''avant la mise a jour de l''EMR. Dans l''EMR : Parametres > Sauvegarde > Sauvegarder.'
    imgBackup = 'Sauvegarde des images (disque)'
    imgOk = 'il y a {0} h - {1} Go libres sur {2} Go'
    imgSilent = 'aucun compte rendu depuis {0} h'
    imgNoDisk = 'disque de sauvegarde absent'
    imgFailed = 'echec : {0}'
    imgFull = 'disque presque plein : {0} Go libres sur {1} Go'
    imgUnreadable = 'etat illisible (logs\image-backup-status.json)'
    adviceImg = 'Sauvegarde des images : branchez le disque de sauvegarde ou remplacez-le s''il est plein. Sinon prevenez le responsable.'
  }
  en = @{
    title = 'Bethesda EMR - server status'
    allOk = 'EVERYTHING IS WORKING'
    someWarn = 'NEEDS ATTENTION'
    someDown = 'SOMETHING IS BROKEN'
    dockerDown = 'Docker is not running. Open Docker Desktop, then start the system again.'
    checkedAt = 'Last checked:'
    everyN = 'Checks again every {0} seconds.'
    dontClose = 'Please leave this window open.'
    langBtn = '한국어'
    db = 'Patient records (database)'
    api = 'Application server'
    web = 'EMR screen'
    pacs = 'Imaging (PACS)'
    bridge = 'Device worklist'
    disk = 'Disk space'
    backup = 'Backup'
    stOk = 'OK'
    stStopped = 'STOPPED'
    stStarting = 'STARTING'
    stUnhealthy = 'NOT RESPONDING'
    stNoPort = 'UNREACHABLE'
    stMissing = 'MISSING'
    stOff = 'not installed'
    diskFree = '{0} GB free of {1} GB'
    backupAge = '{0} h ago ({1})'
    backupNone = 'no backup found'
    bridgeAge = 'reported {0} s ago'
    bridgeSilent = 'silent for {0} min'
    adviceDown = 'Tell the person in charge. Note down whatever is red above.'
    adviceDisk = 'The disk is nearly full. Tell the person in charge.'
    adviceBackup = 'Last night''s backup did not happen. Tell the person in charge.'
    portClosed = 'port {0} not open'
    portReserved = 'port {0} held by Windows'
    advicePort = 'Windows is holding a port (red line). Tell the person in charge: DEPLOYMENT.md, Windows section.'
    pacsAddr = 'Imaging addresses (Settings)'
    notPaired = 'viewer not paired'
    advicePair = 'The viewer is not paired with the image server: run pair-with-emr in the PACS folder (PACS guide 6.1).'
    stFix = 'TO FIX'
    oldPort = 'old port {0} -> {1}'
    adviceAddr = 'Old address in Settings > Order feed: change 8090 to 9090 and 8080 to 9080, then save.'
    backupOldVersion = 'older than the app ({0} database update(s) missing) - {1}'
    adviceBackupOld = 'The newest backup is from before the EMR was updated. In the EMR: Settings > Backup > Back up now.'
    imgBackup = 'Image backup (disk)'
    imgOk = '{0} h ago - {1} GB free of {2} GB'
    imgSilent = 'no report for {0} h'
    imgNoDisk = 'backup disk not plugged in'
    imgFailed = 'failed: {0}'
    imgFull = 'disk almost full: {0} GB free of {1} GB'
    imgUnreadable = 'status file unreadable (logs\image-backup-status.json)'
    adviceImg = 'Image backup: plug in the backup disk, or replace it if it is full. Otherwise tell the person in charge.'
  }
  ko = @{
    title = 'Bethesda EMR - 서버 상태'
    allOk = '정상 작동 중'
    someWarn = '확인 필요'
    someDown = '문제 발생'
    dockerDown = 'Docker가 실행 중이 아닙니다. Docker Desktop을 열고 시스템을 다시 시작하세요.'
    checkedAt = '마지막 확인:'
    everyN = '{0}초마다 자동으로 다시 확인합니다.'
    dontClose = '이 창을 닫지 마세요.'
    langBtn = 'Francais'
    db = '환자 기록 (데이터베이스)'
    api = '애플리케이션 서버'
    web = 'EMR 화면'
    pacs = '영상 (PACS)'
    bridge = '장비 워크리스트'
    disk = '디스크 공간'
    backup = '백업'
    stOk = '정상'
    stStopped = '정지됨'
    stStarting = '시작 중'
    stUnhealthy = '응답 없음'
    stNoPort = '접속 안 됨'
    stMissing = '없음'
    stOff = '미설치'
    diskFree = '{1}GB 중 {0}GB 남음'
    backupAge = '{0}시간 전 ({1})'
    backupNone = '백업 파일 없음'
    bridgeAge = '{0}초 전 보고'
    bridgeSilent = '{0}분째 보고 없음'
    adviceDown = '관리자에게 알리세요. 위에 빨간색으로 표시된 항목을 적어두세요.'
    adviceDisk = '디스크가 거의 찼습니다. 관리자에게 알리세요.'
    adviceBackup = '어젯밤 백업이 실행되지 않았습니다. 관리자에게 알리세요.'
    portClosed = '{0} 포트 닫힘'
    portReserved = '{0} 포트를 Windows가 막음'
    advicePort = 'Windows가 포트를 막고 있습니다(빨간 줄). 관리자에게 알리세요: DEPLOYMENT.md의 Windows 절.'
    pacsAddr = '영상 주소 (설정)'
    notPaired = '영상 창 짝 맞추기 안 됨'
    advicePair = '영상 창이 영상 서버와 짝이 맞지 않습니다: PACS 폴더에서 pair-with-emr를 실행하세요 (PACS 위키 6.1).'
    stFix = '고칠 것'
    oldPort = '옛 포트 {0} → {1}'
    adviceAddr = '설정 → 오더 연동의 주소가 옛 포트입니다. 8090은 9090으로, 8080은 9080으로 고쳐 저장하세요.'
    backupOldVersion = '앱보다 옛 버전 (DB 변경 {0}개 없음) - {1}'
    adviceBackupOld = '가장 새 백업이 EMR 업데이트 전 것입니다. EMR에서 설정 → 백업 → 「지금 백업」을 누르세요.'
    imgBackup = '영상 백업 (디스크)'
    imgOk = '{0}시간 전 - {2}GB 중 {1}GB 남음'
    imgSilent = '{0}시간째 보고 없음'
    imgNoDisk = '백업 디스크가 꽂혀 있지 않음'
    imgFailed = '실패: {0}'
    imgFull = '디스크가 거의 참: {1}GB 중 {0}GB 남음'
    imgUnreadable = '상태 파일을 읽을 수 없음 (logs\image-backup-status.json)'
    adviceImg = '영상 백업: 백업 디스크를 꽂거나, 가득 찼으면 바꾸세요. 그래도 안 되면 관리자에게 알리세요.'
  }
}

$LangOrder = @('fr', 'en', 'ko')

function Invoke-Docker {
  param([string[]]$DockerArgs)
  try {
    $out = & docker @DockerArgs 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return $out
  } catch { return $null }
}

function Test-DockerRunning {
  return $null -ne (Invoke-Docker @('info', '--format', '{{.ServerVersion}}'))
}

# Container state, health, and the host paths it has mounted. The mounts are how
# we find the backup folder and the bridge's worklist folder without asking the
# person running this to configure anything -- Docker already knows where they
# are, whichever drive they were put on.
function Get-ContainerInfo {
  param([string]$Name)
  $fmt = '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}'
  $line = Invoke-Docker @('inspect', $Name, '--format', $fmt)
  if (-not $line) { return $null }
  $parts = ($line | Select-Object -First 1) -split '\|'
  return [pscustomobject]@{
    Status = $parts[0]
    Health = $parts[1]
  }
}

function Get-MountSource {
  param([string]$Container, [string]$Destination)
  # {{println}} rather than {{"\n"}}: Go's template parser rejects the latter
  # outright, and without a line break every mount arrives on one line.
  $fmt = '{{range .Mounts}}{{.Destination}}={{.Source}}{{println}}{{end}}'
  $lines = Invoke-Docker @('inspect', $Container, '--format', $fmt)
  if (-not $lines) { return $null }
  foreach ($l in $lines) {
    $pair = $l -split '=', 2
    if ($pair.Count -eq 2 -and $pair[0] -eq $Destination) { return $pair[1] }
  }
  return $null
}

function Get-ComposeDir {
  param([string]$Container)
  return Invoke-Docker @('inspect', $Container, '--format', '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')
}

function New-Check {
  # Wide: the detail is a sentence for the wide column; the state column gets a short word.
  param([string]$Key, [string]$State, [string]$Detail = '', [bool]$Port = $false, [bool]$Wide = $false)
  return [pscustomobject]@{ Key = $Key; State = $State; Detail = $Detail; Port = $Port; Wide = $Wide }
}

# ------------------------------------------------------- imaging addresses
#
# The EMR moved from 8080 to 9080 and the PACS viewer from 8090 to 9090 (Windows
# reserves the old ones). Addresses typed into Settings > Order feed from the old
# instructions stay in the database - and travel with every backup - and the viewer
# then does not open from the chart. This reads the two fields and warns; it changes
# nothing. The EMR's own status check and the Settings screen say the same.
# Returns $null when there is nothing to say (the row is then not shown at all).
function Get-UrlPort {
  param([string]$Url)
  if ($Url -match '^[a-z]+://[^/:]+:(\d+)(/|$)') { return $Matches[1] }
  return $null
}
# Since P-9 (035, 2026-09-29) the EMR relays the viewer itself through orthanc_url, with
# the image server's password that only the PACS folder's pair-with-emr writes;
# pacs_viewer_url is no longer used and no longer checked. Not paired is reported only
# where the imaging is in use (the worklist bridge has reported, or a worklist host is
# set). Same judgement as the EMR's own status check (status.routes.js).
function Get-PacsAddressCheck {
  param($Strings)
  $sql = 'SELECT coalesce(c.emr_base_url, ''''), coalesce(c.orthanc_url, ''''), ' +
         '(coalesce(c.orthanc_password, '''') <> '''')::text, ' +
         '(EXISTS (SELECT 1 FROM service_heartbeat h WHERE h.name = ''worklist_bridge'') OR coalesce(c.worklist_scp_host, '''') <> '''')::text ' +
         'FROM pacs_config c WHERE c.id = 1'
  $line = Invoke-Docker @('exec', 'bethesda-emr-db', 'psql', '-U', 'medconnect', '-d', 'medconnect', '-At', '-F', '|', '-c', $sql)
  if (-not $line) { return $null }
  $parts = ([string]($line | Select-Object -First 1)) -split '\|'
  if ($parts.Count -lt 4) { return $null }
  $found = @()
  $notPaired = ($parts[3] -eq 'true' -and $parts[2] -ne 'true')
  if ($notPaired) { $found += $Strings.notPaired }
  if ((Get-UrlPort $parts[0].Trim()) -eq '8080') { $found += ($Strings.oldPort -f '8080', '9080') }
  if ((Get-UrlPort $parts[1].Trim()) -eq '8090') { $found += ($Strings.oldPort -f '8090', '9090') }
  if ($found.Count -eq 0) { return $null }
  $c = New-Check 'pacsAddr' 'warn' ($found -join ', ') $false $true
  $c | Add-Member -NotePropertyName Pair -NotePropertyValue $notPaired
  return $c
}

# ------------------------------------------------------------ host ports
#
# A container can be Up and healthy while nothing listens on the host. Windows
# (Hyper-V/WSL) reserves blocks of TCP ports, picked afresh at every boot; when
# a published port lands in one, Docker cannot bind it, the container starts
# anyway, and its healthcheck - which runs inside the container - stays green.
# The screen or the imaging device then times out with nothing looking wrong.
# So for every port a container publishes, connect to it from the host.

# The ports the container was configured to publish, from Docker itself, so a
# port changed in docker-compose.yml is followed without editing this file.
function Get-HostPorts {
  param([string]$Container)
  $json = Invoke-Docker @('inspect', $Container, '--format', '{{json .HostConfig.PortBindings}}')
  if (-not $json -or $json -eq 'null') { return @() }
  $ports = @()
  try {
    $map = ($json | Select-Object -First 1) | ConvertFrom-Json
    foreach ($prop in $map.PSObject.Properties) {
      if ($prop.Name -notlike '*/tcp') { continue }
      foreach ($b in @($prop.Value)) {
        if (-not $b.HostPort) { continue }
        # Unset or "all interfaces" is reachable on loopback; a specific address is not.
        $ip = if (-not $b.HostIp -or $b.HostIp -eq '0.0.0.0' -or $b.HostIp -eq '::') { '127.0.0.1' } else { $b.HostIp }
        $ports += [pscustomobject]@{ Ip = $ip; Port = [int]$b.HostPort }
      }
    }
  } catch {}
  return $ports
}

function Test-HostPort {
  param([string]$Ip, [int]$Port)
  $client = New-Object System.Net.Sockets.TcpClient
  try { return $client.ConnectAsync($Ip, $Port).Wait(1000) }
  catch { return $false }
  finally { $client.Close() }
}

# `netsh ... excludedportrange` prints a localized header and then "start end"
# pairs; only the number pairs are read, so a French or Korean Windows parses
# the same. Asked only when a port is found closed.
function Get-ReservedRanges {
  $ranges = @()
  try {
    $lines = & netsh interface ipv4 show excludedportrange protocol=tcp 2>$null
    foreach ($l in $lines) {
      if ($l -match '^\s*(\d+)\s+(\d+)') { $ranges += ,@([int]$Matches[1], [int]$Matches[2]) }
    }
  } catch {}
  # The comma keeps a single range from being unrolled into two loose numbers.
  return ,$ranges
}

# Downgrades a container check that looked fine when one of its published
# ports cannot be reached. A reserved port is named as such, because that is
# the cause, and it is not one a restart of the app will fix.
function Add-PortCheck {
  param($Check, [string]$Container, $Strings)
  if ($Check.State -ne 'ok' -and $Check.State -ne 'warn') { return $Check }
  $problems = @()
  $reserved = $null
  foreach ($p in (Get-HostPorts -Container $Container)) {
    if (Test-HostPort -Ip $p.Ip -Port $p.Port) { continue }
    if ($null -eq $reserved) { $reserved = Get-ReservedRanges }
    $held = $false
    foreach ($r in $reserved) { if ($p.Port -ge $r[0] -and $p.Port -le $r[1]) { $held = $true } }
    $problems += if ($held) { $Strings.portReserved -f $p.Port } else { $Strings.portClosed -f $p.Port }
  }
  if ($problems.Count -eq 0) { return $Check }
  return New-Check $Check.Key 'down' ($problems -join ', ') $true
}

function Get-ContainerCheck {
  param($Spec, $Strings)
  $info = Get-ContainerInfo -Name $Spec.Name
  if (-not $info) {
    if ($Spec.Required) { return New-Check $Spec.Key 'down' $Strings.stMissing }
    return New-Check $Spec.Key 'off' $Strings.stOff
  }
  if ($info.Status -ne 'running') { return New-Check $Spec.Key 'down' $Strings.stStopped }
  switch ($info.Health) {
    'healthy'   { return New-Check $Spec.Key 'ok' $Strings.stOk }
    'starting'  { return New-Check $Spec.Key 'warn' $Strings.stStarting }
    'unhealthy' { return New-Check $Spec.Key 'down' $Strings.stUnhealthy }
    default     { return New-Check $Spec.Key 'ok' $Strings.stOk }
  }
}

# Where Docker Desktop keeps its disk (and so the database): its settings may name a
# custom folder; otherwise it is under %LOCALAPPDATA%\Docker.
function Get-DockerDataDrive {
  foreach ($f in @("$env:APPDATA\Docker\settings-store.json", "$env:APPDATA\Docker\settings.json")) {
    if (-not (Test-Path $f)) { continue }
    try {
      $j = Get-Content $f -Raw | ConvertFrom-Json
      foreach ($k in @('CustomWslDistroDir', 'DataFolder')) {
        $v = $j.$k
        if ($v -and ($v -match '^[A-Za-z]:')) { return $v.Substring(0, 2).ToUpper() }
      }
    } catch {}
  }
  if ($env:LOCALAPPDATA) { return (Split-Path -Qualifier $env:LOCALAPPDATA).ToUpper() }
  return $null
}

# B7 (2026-09-29): the drive the backups go to and the drive Docker (the database) is
# on. Only the first was checked, so with BACKUP_PATH on D: a full C: went unnoticed.
# One drive -> the line reads as before; two -> both, and the fuller one decides.
function Get-DiskCheck {
  param($Strings, [string]$BackupPath)
  $path = if ($BackupPath) { $BackupPath } else { $PSScriptRoot }
  try {
    $drives = @((Split-Path -Qualifier $path).ToUpper())
    $dd = Get-DockerDataDrive
    if ($dd -and $drives -notcontains $dd) { $drives += $dd }
    $state = 'ok'; $parts = @()
    foreach ($q in $drives) {
      $drive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$q'"
      if (-not $drive) { continue }
      $freeGb = [math]::Round($drive.FreeSpace / 1GB)
      $totalGb = [math]::Round($drive.Size / 1GB)
      $text = $Strings.diskFree -f $freeGb, $totalGb
      $parts += $(if ($drives.Count -gt 1) { "${q} $text" } else { $text })
      if ($freeGb -lt $DiskDownFreeGb) { $state = 'down' }
      elseif ($freeGb -lt $DiskWarnFreeGb -and $state -ne 'down') { $state = 'warn' }
    }
    if ($parts.Count -eq 0) { return New-Check 'disk' 'warn' '?' }
    return New-Check 'disk' $state ($parts -join ' - ')
  } catch {
    return New-Check 'disk' 'warn' '?'
  }
}

# The check nobody notices has been failing until the day they need it.
# The migration file names in a backup's schema_migrations data, or $null. A backup
# restores with the usual steps only onto the version that made it (DEPLOYMENT.md 5b), so
# a newest backup from before the last update is worth a yellow line. Backup files never
# change, so each is read once (by name, size and time) - not every 15 seconds.
$script:DumpMigrationCache = @{}
function Get-DumpMigrations {
  param($File)
  $key = '{0}|{1}|{2}' -f $File.FullName, $File.Length, $File.LastWriteTime.Ticks
  if ($script:DumpMigrationCache.ContainsKey($key)) { return $script:DumpMigrationCache[$key] }
  $names = $null
  $fs = $null
  try {
    $fs = [IO.File]::OpenRead($File.FullName)
    $gz = New-Object IO.Compression.GZipStream($fs, [IO.Compression.CompressionMode]::Decompress)
    $rd = New-Object IO.StreamReader($gz, [Text.Encoding]::UTF8)
    $inBlock = $false
    while ($null -ne ($line = $rd.ReadLine())) {
      if (-not $inBlock) { if ($line.StartsWith('COPY public.schema_migrations ')) { $inBlock = $true; $names = @() }; continue }
      if ($line -eq '\.') { break }
      $names += ($line -split "`t")[0]
    }
    $rd.Dispose()
  } catch { $names = $null } finally { if ($fs) { $fs.Dispose() } }
  $script:DumpMigrationCache[$key] = $names
  return $names
}

# The nightly image backup to an external disk (PACS image-backup.ps1, decision 41)
# writes its last result to the PACS folder's logs\image-backup-status.json - read here
# rather than from the EMR, so this still answers when the EMR is down. No file (the
# backup was never set up on this PC) -> no row at all.
function Get-ImageBackupCheck {
  param($Strings)
  $dir = Get-ComposeDir -Container 'bethesda-pacs'
  if (-not $dir) { return $null }
  $file = Join-Path $dir 'logs\image-backup-status.json'
  if (-not (Test-Path $file)) { return $null }
  try { $s = Get-Content $file -Raw -Encoding UTF8 | ConvertFrom-Json } catch { return New-Check 'imgBackup' 'warn' ($Strings.imgUnreadable) $false $true }
  $at = $null
  try { $at = [datetime]::Parse([string]$s.at, [Globalization.CultureInfo]::InvariantCulture) } catch {}
  $hours = if ($at) { [math]::Round(((Get-Date) - $at).TotalHours) } else { $null }
  if ($null -eq $hours -or $hours -gt $BackupStaleHours) { return New-Check 'imgBackup' 'warn' ($Strings.imgSilent -f $hours) $false $true }
  if ($s.disk_found -eq $false) { return New-Check 'imgBackup' 'warn' $Strings.imgNoDisk $false $true }
  if ($s.ok -ne $true) { return New-Check 'imgBackup' 'warn' ($Strings.imgFailed -f [string]$s.error) $false $true }
  $free = [double]("0" + $s.free_gb); $total = [double]("0" + $s.total_gb)
  if ($total -gt 0 -and ($free / $total) -lt 0.1) { return New-Check 'imgBackup' 'warn' ($Strings.imgFull -f [math]::Round($free), [math]::Round($total)) $false $true }
  return New-Check 'imgBackup' 'ok' ($Strings.imgOk -f $hours, [math]::Round($free), [math]::Round($total))
}

function Get-BackupCheck {
  param($Strings, [string]$BackupPath, [bool]$DbOk = $false)
  if (-not $BackupPath -or -not (Test-Path $BackupPath)) {
    return New-Check 'backup' 'warn' $Strings.backupNone
  }
  $newest = Get-ChildItem -Path $BackupPath -Filter '*.sql.gz' -File -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $newest) { return New-Check 'backup' 'warn' $Strings.backupNone }
  $hours = [math]::Round(((Get-Date) - $newest.LastWriteTime).TotalHours)
  $detail = $Strings.backupAge -f $hours, $newest.Name
  if ($hours -gt $BackupStaleHours) { return New-Check 'backup' 'warn' $detail }
  if ($DbOk) {
    $inBackup = Get-DumpMigrations -File $newest
    $inDb = Invoke-Docker @('exec', 'bethesda-emr-db', 'psql', '-U', 'medconnect', '-d', 'medconnect', '-At',
      '-c', 'SELECT filename FROM schema_migrations')
    if ($null -ne $inBackup -and $inDb) {
      $missing = @($inDb | Where-Object { $_ -and ($inBackup -notcontains $_) })
      if ($missing.Count -gt 0) {
        return New-Check 'backup' 'warn' ($Strings.backupOldVersion -f $missing.Count, $newest.Name) $false $true
      }
    }
  }
  return New-Check 'backup' 'ok' $detail
}

# The bridge writes this file after every cycle. Reading it here rather than
# asking the EMR means we still get an answer when the EMR is the thing that
# broke -- and a wedged bridge, which stays "running" as far as Docker is
# concerned, shows up as an old timestamp.
function Get-BridgeHeartbeatCheck {
  param($Strings, $ContainerCheck)
  if ($ContainerCheck.State -eq 'off') { return $ContainerCheck }
  $dir = Get-ComposeDir -Container 'bethesda-worklist-bridge'
  $file = if ($dir) { Join-Path $dir 'worklists\.heartbeat' } else { $null }
  if (-not $file -or -not (Test-Path $file)) { return $ContainerCheck }
  $age = [math]::Round(((Get-Date) - (Get-Item $file).LastWriteTime).TotalSeconds)
  if ($age -gt $BridgeStaleSeconds) {
    return New-Check 'bridge' 'down' ($Strings.bridgeSilent -f [math]::Round($age / 60))
  }
  if ($ContainerCheck.State -ne 'ok') { return $ContainerCheck }
  return New-Check 'bridge' 'ok' ($Strings.bridgeAge -f $age)
}

function Get-AllChecks {
  param($Strings)
  if (-not (Test-DockerRunning)) {
    return [pscustomobject]@{
      Overall = 'down'
      DockerDown = $true
      Checks = @()
    }
  }

  $checks = @{}
  foreach ($spec in $Containers) { $checks[$spec.Key] = Get-ContainerCheck -Spec $spec -Strings $Strings }
  $checks['bridge'] = Get-BridgeHeartbeatCheck -Strings $Strings -ContainerCheck $checks['bridge']
  # The two that publish ports to the host: the EMR screen (9080) and the PACS
  # (viewer 9090, DICOM 4242). The others are reached only inside Docker.
  $checks['web']  = Add-PortCheck -Check $checks['web']  -Container 'bethesda-emr-web' -Strings $Strings
  $checks['pacs'] = Add-PortCheck -Check $checks['pacs'] -Container 'bethesda-pacs'    -Strings $Strings

  # Docker already knows where the backup folder was put, whichever drive that
  # is, so nobody has to configure it here. If it cannot tell us, fall back to
  # the folder next to this script.
  $backupPath = Get-MountSource -Container 'bethesda-emr-api' -Destination '/backups'
  if (-not $backupPath) { $backupPath = Join-Path $PSScriptRoot 'backups' }
  $ordered = @(
    $checks['db'], $checks['api'], $checks['web'],
    (Get-DiskCheck -Strings $Strings -BackupPath $backupPath),
    (Get-BackupCheck -Strings $Strings -BackupPath $backupPath -DbOk ($checks['db'].State -eq 'ok')),
    $checks['pacs'], $checks['bridge']
  )
  $img = Get-ImageBackupCheck -Strings $Strings
  if ($img) { $ordered += $img }
  # Only while the database answers; a row appears only when an address is old.
  if ($checks['db'].State -eq 'ok') {
    $addr = Get-PacsAddressCheck -Strings $Strings
    if ($addr) { $ordered += $addr }
  }

  $rank = @{ ok = 0; off = 0; warn = 1; down = 2 }
  $overall = 'ok'
  foreach ($c in $ordered) { if ($rank[$c.State] -gt $rank[$overall]) { $overall = $c.State } }

  return [pscustomobject]@{
    Overall = $overall
    DockerDown = $false
    Checks = $ordered
  }
}

function Get-Advice {
  param($Result, $Strings)
  if ($Result.DockerDown) { return $Strings.dockerDown }
  foreach ($c in $Result.Checks) {
    if ($c.State -eq 'down' -and $c.Port) { return $Strings.advicePort }
  }
  foreach ($c in $Result.Checks) {
    if ($c.State -eq 'down') { return $Strings.adviceDown }
  }
  foreach ($c in $Result.Checks) {
    if ($c.State -eq 'warn') {
      if ($c.Key -eq 'disk') { return $Strings.adviceDisk }
      if ($c.Key -eq 'backup' -and $c.Wide) { return $Strings.adviceBackupOld }
      if ($c.Key -eq 'backup') { return $Strings.adviceBackup }
      if ($c.Key -eq 'pacsAddr' -and $c.Pair) { return $Strings.advicePair }
      if ($c.Key -eq 'pacsAddr') { return $Strings.adviceAddr }
      if ($c.Key -eq 'imgBackup') { return $Strings.adviceImg }
      return $Strings.adviceDown
    }
  }
  return ''
}

# ---------------------------------------------------------------- console mode

if ($Console) {
  $s = $T[$Lang]
  $r = Get-AllChecks -Strings $s
  Write-Output ('{0}: {1}' -f $s.title, $r.Overall.ToUpper())
  if ($r.DockerDown) { Write-Output $s.dockerDown; exit 2 }
  foreach ($c in $r.Checks) {
    Write-Output ('  {0,-36} {1,-6} {2}' -f $s[$c.Key], $c.State, $c.Detail)
  }
  $advice = Get-Advice -Result $r -Strings $s
  if ($advice) { Write-Output '' ; Write-Output $advice }
  if ($r.Overall -eq 'down') { exit 2 } elseif ($r.Overall -eq 'warn') { exit 1 } else { exit 0 }
}

# ----------------------------------------------------------------- window mode

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$script:CurrentLang = $Lang

$ColorOk    = [System.Drawing.Color]::FromArgb(22, 128, 62)
$ColorWarn  = [System.Drawing.Color]::FromArgb(180, 120, 0)
$ColorDown  = [System.Drawing.Color]::FromArgb(190, 30, 30)
$ColorOff   = [System.Drawing.Color]::FromArgb(130, 130, 130)
$ColorPaper = [System.Drawing.Color]::FromArgb(248, 248, 246)

$form = New-Object System.Windows.Forms.Form
$form.Text = $T[$script:CurrentLang].title
# Room for up to nine rows (the seven, plus imaging addresses and image backup when they show).
$form.Size = New-Object System.Drawing.Size(620, 640)
$form.StartPosition = 'CenterScreen'
$form.BackColor = $ColorPaper

$banner = New-Object System.Windows.Forms.Label
$banner.Dock = 'Top'
$banner.Height = 90
$banner.TextAlign = 'MiddleCenter'
$banner.Font = New-Object System.Drawing.Font('Segoe UI', 22, [System.Drawing.FontStyle]::Bold)
$banner.ForeColor = [System.Drawing.Color]::White
$form.Controls.Add($banner)

$rows = New-Object System.Windows.Forms.TableLayoutPanel
$rows.Dock = 'Fill'
$rows.ColumnCount = 3
$rows.Padding = New-Object System.Windows.Forms.Padding(18, 14, 18, 8)
[void]$rows.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 46)))
[void]$rows.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 22)))
[void]$rows.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 32)))
$form.Controls.Add($rows)

$footer = New-Object System.Windows.Forms.Panel
$footer.Dock = 'Bottom'
$footer.Height = 96
$form.Controls.Add($footer)

$advice = New-Object System.Windows.Forms.Label
$advice.Dock = 'Top'
$advice.Height = 44
$advice.TextAlign = 'MiddleCenter'
$advice.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$footer.Controls.Add($advice)

$stamp = New-Object System.Windows.Forms.Label
$stamp.Dock = 'Top'
$stamp.Height = 26
$stamp.TextAlign = 'MiddleCenter'
$stamp.ForeColor = [System.Drawing.Color]::FromArgb(90, 90, 90)
$stamp.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$footer.Controls.Add($stamp)

$langButton = New-Object System.Windows.Forms.Button
$langButton.Dock = 'Bottom'
$langButton.Height = 26
$langButton.FlatStyle = 'Flat'
$footer.Controls.Add($langButton)

# WinForms docks from the back of the z-order to the front, so the Fill panel
# must be frontmost to be docked last, into whatever the banner and the footer
# leave. Added in the order above it was docked second and took the whole top
# of the window, and the banner was then drawn over its first two rows - the
# database and the application server, the two lines that matter most, were
# hidden under the word PROBLEME.
$rows.BringToFront()

# The banner and the rows are rebuilt on every pass rather than patched, so a
# stale row can never be left behind reading OK after its check stopped running.
function Update-Window {
  $s = $T[$script:CurrentLang]
  $form.Text = $s.title
  $langButton.Text = $s.langBtn

  $r = Get-AllChecks -Strings $s

  switch ($r.Overall) {
    'ok'   { $banner.Text = $s.allOk;    $banner.BackColor = $ColorOk }
    'warn' { $banner.Text = $s.someWarn; $banner.BackColor = $ColorWarn }
    default { $banner.Text = $s.someDown; $banner.BackColor = $ColorDown }
  }

  $rows.Controls.Clear()
  $rows.RowStyles.Clear()
  $rows.RowCount = 0

  foreach ($c in $r.Checks) {
    $color = switch ($c.State) {
      'ok'   { $ColorOk }
      'warn' { $ColorWarn }
      'off'  { $ColorOff }
      default { $ColorDown }
    }

    $name = New-Object System.Windows.Forms.Label
    $name.Text = $s[$c.Key]
    $name.Font = New-Object System.Drawing.Font('Segoe UI', 11)
    $name.AutoSize = $false
    $name.Dock = 'Fill'
    $name.TextAlign = 'MiddleLeft'

    $state = New-Object System.Windows.Forms.Label
    # A port problem has a long explanation; it goes in the wide column, not this one.
    $state.Text = if ($c.State -eq 'ok') { $s.stOk } elseif ($c.State -eq 'off') { $s.stOff } elseif ($c.Port) { $s.stNoPort } elseif ($c.Wide) { $s.stFix } else { $c.Detail }
    $state.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
    $state.ForeColor = $color
    $state.Dock = 'Fill'
    $state.TextAlign = 'MiddleLeft'

    $detail = New-Object System.Windows.Forms.Label
    $detail.Text = if ($c.State -eq 'ok' -or $c.State -eq 'off' -or $c.Port -or $c.Wide) { $c.Detail } else { '' }
    $detail.Font = New-Object System.Drawing.Font('Segoe UI', 9)
    $detail.ForeColor = [System.Drawing.Color]::FromArgb(90, 90, 90)
    $detail.Dock = 'Fill'
    $detail.TextAlign = 'MiddleLeft'

    if ($c.State -eq 'ok' -or $c.State -eq 'off') { $state.Text = $s.stOk; }
    if ($c.State -eq 'off') { $state.Text = $s.stOff; $state.ForeColor = $ColorOff }

    [void]$rows.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 38)))
    $rows.RowCount = $rows.RowCount + 1
    $rows.Controls.Add($name, 0, $rows.RowCount - 1)
    $rows.Controls.Add($state, 1, $rows.RowCount - 1)
    $rows.Controls.Add($detail, 2, $rows.RowCount - 1)
  }
  # An empty last row takes the spare height; otherwise the table hands it all
  # to the last real row, whose text then floats in the middle of a tall gap.
  [void]$rows.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 100)))
  $rows.RowCount = $rows.RowCount + 1

  $text = Get-Advice -Result $r -Strings $s
  $advice.Text = $text
  $advice.ForeColor = if ($r.Overall -eq 'ok') { $ColorOk } else { $ColorDown }
  if ($r.Overall -eq 'ok') { $advice.Text = $s.dontClose }

  $stamp.Text = ('{0} {1}   -   {2}' -f $s.checkedAt, (Get-Date -Format 'HH:mm:ss'), ($s.everyN -f $RefreshSeconds))
}

$langButton.Add_Click({
  $i = [array]::IndexOf($LangOrder, $script:CurrentLang)
  $script:CurrentLang = $LangOrder[($i + 1) % $LangOrder.Count]
  Update-Window
})

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = $RefreshSeconds * 1000
$timer.Add_Tick({ Update-Window })
$timer.Start()

Update-Window
[void]$form.ShowDialog()

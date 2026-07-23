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
  param([string]$Key, [string]$State, [string]$Detail = '')
  return [pscustomobject]@{ Key = $Key; State = $State; Detail = $Detail }
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

function Get-DiskCheck {
  param($Strings, [string]$BackupPath)
  $path = if ($BackupPath) { $BackupPath } else { $PSScriptRoot }
  try {
    $qualifier = (Split-Path -Qualifier $path)
    $drive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$qualifier'"
    $freeGb = [math]::Round($drive.FreeSpace / 1GB)
    $totalGb = [math]::Round($drive.Size / 1GB)
    $detail = $Strings.diskFree -f $freeGb, $totalGb
    if ($freeGb -lt $DiskDownFreeGb) { return New-Check 'disk' 'down' $detail }
    if ($freeGb -lt $DiskWarnFreeGb) { return New-Check 'disk' 'warn' $detail }
    return New-Check 'disk' 'ok' $detail
  } catch {
    return New-Check 'disk' 'warn' '?'
  }
}

# The check nobody notices has been failing until the day they need it.
function Get-BackupCheck {
  param($Strings, [string]$BackupPath)
  if (-not $BackupPath -or -not (Test-Path $BackupPath)) {
    return New-Check 'backup' 'warn' $Strings.backupNone
  }
  $newest = Get-ChildItem -Path $BackupPath -Filter '*.sql.gz' -File -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $newest) { return New-Check 'backup' 'warn' $Strings.backupNone }
  $hours = [math]::Round(((Get-Date) - $newest.LastWriteTime).TotalHours)
  $detail = $Strings.backupAge -f $hours, $newest.Name
  if ($hours -gt $BackupStaleHours) { return New-Check 'backup' 'warn' $detail }
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

  # Docker already knows where the backup folder was put, whichever drive that
  # is, so nobody has to configure it here. If it cannot tell us, fall back to
  # the folder next to this script.
  $backupPath = Get-MountSource -Container 'bethesda-emr-api' -Destination '/backups'
  if (-not $backupPath) { $backupPath = Join-Path $PSScriptRoot 'backups' }
  $ordered = @(
    $checks['db'], $checks['api'], $checks['web'],
    (Get-DiskCheck -Strings $Strings -BackupPath $backupPath),
    (Get-BackupCheck -Strings $Strings -BackupPath $backupPath),
    $checks['pacs'], $checks['bridge']
  )

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
    if ($c.State -eq 'down') { return $Strings.adviceDown }
  }
  foreach ($c in $Result.Checks) {
    if ($c.State -eq 'warn') {
      if ($c.Key -eq 'disk') { return $Strings.adviceDisk }
      if ($c.Key -eq 'backup') { return $Strings.adviceBackup }
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
$form.Size = New-Object System.Drawing.Size(620, 560)
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
    $state.Text = if ($c.State -eq 'ok') { $s.stOk } elseif ($c.State -eq 'off') { $s.stOff } else { $c.Detail }
    $state.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
    $state.ForeColor = $color
    $state.Dock = 'Fill'
    $state.TextAlign = 'MiddleLeft'

    $detail = New-Object System.Windows.Forms.Label
    $detail.Text = if ($c.State -eq 'ok' -or $c.State -eq 'off') { $c.Detail } else { '' }
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

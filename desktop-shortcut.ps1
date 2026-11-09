# Bethesda EMR - a shortcut "Bethesda EMR" on the desktop of this PC.
# Run by setup.ps1 at the end of an installation (the server: http://localhost:9080).
# On another PC of the clinic: copy this file, desktop-shortcut.bat and bethesda-emr.ico
# to it (a USB stick will do) and double-click desktop-shortcut.bat - it asks for the
# address of the server once (for example http://10.0.0.5:9080).
#
# Same way and same names as the PACS repository's desktop-shortcuts.ps1: a web address is
# a small .url text file; only that file (and a copy of the icon) is written - no registry
# key, no scheduled task, no Start menu entry. A shortcut that is there already is
# corrected, not doubled.
#
#   -EmrUrl http://...   the address to open (default: http://localhost:9080)
#   -Ask                 ask for the address (the answer may be left empty for the default)
#   -Desktop <folder>    where to put the shortcut (default: this user's desktop)
#   -IconFile x.ico      the icon (default: bethesda-emr.ico beside this script, if there)
param([string]$EmrUrl = '', [switch]$Ask, [string]$Desktop = '', [string]$IconFile = '')
$ErrorActionPreference = 'Stop'
$default = 'http://localhost:9080'
if ($Ask -and -not $EmrUrl) {
  $EmrUrl = (Read-Host "Address of the Bethesda EMR server (Enter = $default)").Trim()
}
if (-not $EmrUrl) { $EmrUrl = $default }
if ($EmrUrl -notmatch '^https?://') { $EmrUrl = 'http://' + $EmrUrl }
if (-not $Desktop) { $Desktop = [Environment]::GetFolderPath('Desktop') }
if (-not $IconFile) { $own = Join-Path $PSScriptRoot 'bethesda-emr.ico'; if (Test-Path -LiteralPath $own) { $IconFile = $own } }

$lines = @('[InternetShortcut]', "URL=$EmrUrl")
if ($IconFile -and (Test-Path -LiteralPath $IconFile)) {
  # An icon on a fixed disk (the installation folder, C:\Bethesda-EMRethesda-emr.ico) is
  # pointed at where it is. It used to be copied to %LOCALAPPDATA%\Bethesda; but a shell of
  # a packaged (MSIX) app - an AI assistant's terminal, for one - has its AppData writes
  # redirected into the package's private folder, so the copy landed where the shortcut
  # could not see it and the desktop showed a blank icon (Bethesda, 2026-11-08). Only an
  # icon on removable media (the kit on a USB stick, taken away again) is copied, to
  # %ProgramData%, which is not redirected.
  $icon = (Resolve-Path -LiteralPath $IconFile).Path
  $removable = $false
  try { $removable = ([IO.DriveInfo]::new([IO.Path]::GetPathRoot($icon))).DriveType -eq 'Removable' } catch { }
  if ($removable) {
    $keep = Join-Path $env:ProgramData 'Bethesda'
    if (-not (Test-Path -LiteralPath $keep)) { New-Item -ItemType Directory -Force -Path $keep | Out-Null }
    $icon = Join-Path $keep 'bethesda-emr.ico'
    Copy-Item -LiteralPath $IconFile -Destination $icon -Force
  }
  $lines += @("IconFile=$icon", 'IconIndex=0')
}
$url = Join-Path $Desktop 'Bethesda EMR.url'
$was = Test-Path -LiteralPath $url
[IO.File]::WriteAllLines($url, $lines, [Text.Encoding]::ASCII)
"shortcut: $url -> $EmrUrl ($(if ($was) { 'corrected' } else { 'made' }))"

# The second shortcut: "Mise à jour Bethesda" runs offline\bethesda-update.ps1 (the one-click
# update, French and Korean windows, no administrator rights). Only on the server itself:
# the script must sit in the installed EMR folder, which is where this file is.
$upd = Join-Path $PSScriptRoot 'offline\bethesda-update.ps1'
if (Test-Path -LiteralPath $upd) {
  try {
    # Made under an ASCII name and renamed: the COM shortcut object loses the accent of
    # the name on a Windows whose system code page has no "a grave" (Korean Windows gave
    # "Mise a jour"); Rename-Item is Unicode and keeps it.
    $lnk = Join-Path $Desktop ('Mise ' + [char]0xE0 + ' jour Bethesda.lnk')
    $tmpLnk = Join-Path $Desktop 'Mise a jour Bethesda.lnk'
    $wasL = Test-Path -LiteralPath $lnk
    $sh = New-Object -ComObject WScript.Shell
    $sc = $sh.CreateShortcut($tmpLnk)
    $sc.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $sc.Arguments = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $upd + '"'   # the script shows its own window
    $sc.WorkingDirectory = $PSScriptRoot
    $sc.Description = 'Mise à jour Bethesda EMR / Bethesda EMR 업데이트'
    # Its own icon (the EMR icon with a green download badge, bethesda-update.ico): the two
    # shortcuts looked identical on the desktop (clinic manager, 2026-11-09). An older kit without
    # that file falls back to the EMR icon.
    $updIcon = Join-Path $PSScriptRoot 'bethesda-update.ico'
    if (Test-Path -LiteralPath $updIcon) { $sc.IconLocation = (Resolve-Path -LiteralPath $updIcon).Path + ',0' }
    elseif ($IconFile -and (Test-Path -LiteralPath $IconFile)) { $sc.IconLocation = (Resolve-Path -LiteralPath $IconFile).Path + ',0' }
    $sc.Save()
    if (Test-Path -LiteralPath $lnk) { Remove-Item -LiteralPath $lnk -Force }
    Rename-Item -LiteralPath $tmpLnk -NewName (Split-Path -Leaf $lnk)
    "shortcut: $lnk -> bethesda-update.ps1 ($(if ($wasL) { 'corrected' } else { 'made' }))"
  } catch { Write-Host "The update shortcut could not be made ($($_.Exception.Message))." -ForegroundColor Yellow }
}

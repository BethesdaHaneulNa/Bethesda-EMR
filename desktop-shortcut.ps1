# Bethesda EMR - a shortcut "Bethesda EMR" on the desktop of this PC.
# Run by setup.ps1 at the end of an installation (the server: http://localhost:9080).
# On another PC of the clinic: copy this file, desktop-shortcut.bat and bethesda-emr.ico
# to it (a USB stick will do) and double-click desktop-shortcut.bat - it asks for the
# address of the server once (for example http://192.168.1.10:9080).
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
  # The icon is copied to a place that stays (a USB stick is taken away again, an
  # installation folder may move); the shortcut points at the copy.
  $keep = Join-Path $env:LOCALAPPDATA 'Bethesda'
  if (-not (Test-Path -LiteralPath $keep)) { New-Item -ItemType Directory -Force -Path $keep | Out-Null }
  $icon = Join-Path $keep 'bethesda-emr.ico'
  Copy-Item -LiteralPath $IconFile -Destination $icon -Force
  $lines += @("IconFile=$icon", 'IconIndex=0')
}
$url = Join-Path $Desktop 'Bethesda EMR.url'
$was = Test-Path -LiteralPath $url
[IO.File]::WriteAllLines($url, $lines, [Text.Encoding]::ASCII)
"shortcut: $url -> $EmrUrl ($(if ($was) { 'corrected' } else { 'made' }))"

# Build an offline install kit for Bethesda EMR (+ optional PACS).
#
# Run this ON A MACHINE WITH GOOD INTERNET (i.e. before you travel). It builds every
# image, saves them to a tarball, copies a clean source tree next to them, and leaves
# a self-contained folder you can hand to a clinic that has no usable connection.
#
#   .\offline\pack.ps1                          -> F:\bethesda-offline-kit
#   .\offline\pack.ps1 -Destination E:\kit
#   .\offline\pack.ps1 -NoPacs                  -> EMR only
#
# The running containers are not touched. Building does move the image names
# (bethesda-emr-backend:latest ...) onto the freshly built images, and the next
# 'docker compose up -d' on this machine would then start those - so once the images
# are saved, the names are put back on the images they pointed to before.
#
# Pack from the state you mean to ship: both repositories on their release commit with
# nothing uncommitted. MANIFEST.txt records the commits, and says so if not.

param(
  [string]$Destination = 'F:\bethesda-offline-kit',
  [string]$PacsPath    = '',
  [switch]$NoPacs
)

$ErrorActionPreference = 'Stop'
$emrRoot = Split-Path $PSScriptRoot -Parent

# The PACS repo is a sibling checkout by default (that is how both are published).
if (-not $PacsPath) { $PacsPath = Join-Path (Split-Path $emrRoot -Parent) 'Bethesda-PACS-main' }

function Say([string]$m) { Write-Host "  $m" }
function Step([string]$m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Die([string]$m) { Write-Host "ERROR: $m" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- preflight
Step "Checking Docker"
docker version --format '{{.Server.Version}}' 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { Die "Docker is not running. Start Docker Desktop and try again." }
Say "Docker is up."

$includePacs = -not $NoPacs
if ($includePacs -and -not (Test-Path (Join-Path $PacsPath 'docker-compose.yml'))) {
  Say "No PACS repo at $PacsPath - packing EMR only. (Use -PacsPath to point at it, or -NoPacs to silence this.)"
  $includePacs = $false
}

# `docker compose` refuses to even parse the file when JWT_SECRET is unset (that is
# deliberate - see docker-compose.yml). Building does not use the value, so a
# throwaway one is enough to let the parse succeed on a machine with no .env.
if (-not (Test-Path (Join-Path $emrRoot '.env'))) {
  $env:JWT_SECRET = 'pack-time-placeholder-not-used-at-runtime'
  Say "No .env here - using a placeholder secret for the build only."
}

# The PACS compose file reads its secrets from .env too. A machine that only packs has
# none; the build does not use them, so placeholders let the file parse.
if ($includePacs -and -not (Test-Path (Join-Path $PacsPath '.env'))) {
  if (-not $env:ORTHANC_PASSWORD) { $env:ORTHANC_PASSWORD = 'pack-time-placeholder-not-used-at-runtime' }
  if (-not $env:BRIDGE_TOKEN)     { $env:BRIDGE_TOKEN     = 'pack-time-placeholder-not-used-at-runtime' }
  Say "No PACS .env here - using placeholder secrets for the build only."
}

$emrVersion = (Get-Content (Join-Path $emrRoot 'backend\package.json') -Raw | ConvertFrom-Json).version
Say "EMR version $emrVersion"

# Which commit is being packed, and whether the folder holds anything git does not
# know about yet. A kit built from a half-edited folder cannot be traced afterwards.
function Get-RepoState([string]$path) {
  $state = @{ Commit = 'not a git checkout'; Branch = ''; Dirty = $false }
  if (-not (Test-Path (Join-Path $path '.git'))) { return $state }
  $c = (git -C $path rev-parse --short HEAD 2>$null)
  if ($LASTEXITCODE -eq 0 -and $c) { $state.Commit = "$c".Trim() }
  $b = (git -C $path rev-parse --abbrev-ref HEAD 2>$null)
  if ($LASTEXITCODE -eq 0 -and $b) { $state.Branch = "$b".Trim() }
  $state.Dirty = [bool](git -C $path status --porcelain 2>$null)
  $global:LASTEXITCODE = 0
  return $state
}
function Show-RepoState($st) {
  $t = "$($st.Commit)"
  if ($st.Branch) { $t += " ($($st.Branch))" }
  if ($st.Dirty)  { $t += '  ** PACKED WITH UNCOMMITTED CHANGES **' }
  return $t
}
$emrState  = Get-RepoState $emrRoot
$pacsState = $null
if ($includePacs) { $pacsState = Get-RepoState $PacsPath }
Say "EMR  commit $(Show-RepoState $emrState)"
if ($pacsState) { Say "PACS commit $(Show-RepoState $pacsState)" }
if ($emrState.Dirty -or ($pacsState -and $pacsState.Dirty)) {
  Write-Host "  WARNING: packing a folder with uncommitted changes. MANIFEST.txt will say so." -ForegroundColor Yellow
}

# Where each image name points now, so it can be put back once the kit is saved.
function Get-ImageIds([string]$path) {
  $map = @{}
  Push-Location $path
  foreach ($img in (@(docker compose config --images) | Where-Object { $_ })) {
    $id = (docker image inspect -f '{{.Id}}' $img 2>$null)
    if ($LASTEXITCODE -eq 0 -and $id) { $map[$img] = "$id".Trim() }
  }
  Pop-Location
  $global:LASTEXITCODE = 0
  return $map
}
$before = Get-ImageIds $emrRoot
if ($includePacs) {
  $pacsBefore = Get-ImageIds $PacsPath
  foreach ($k in $pacsBefore.Keys) { $before[$k] = $pacsBefore[$k] }
}

# ---------------------------------------------------------------- build
Step "Building EMR images (this is the slow part)"
Push-Location $emrRoot
docker compose build
if ($LASTEXITCODE -ne 0) { Pop-Location; Die "EMR build failed." }
$emrImages = @(docker compose config --images) | Where-Object { $_ }
Pop-Location
Say ($emrImages -join ', ')

$pacsImages = @()
if ($includePacs) {
  Step "Building PACS images"
  Push-Location $PacsPath
  docker compose build
  if ($LASTEXITCODE -ne 0) { Pop-Location; Die "PACS build failed." }
  $pacsImages = @(docker compose config --images) | Where-Object { $_ }
  Pop-Location
  Say ($pacsImages -join ', ')
}

# Base images (postgres, orthanc) are referenced but not built, so they may not be
# present yet. Pull anything the compose files name that we do not already have.
Step "Fetching base images"
foreach ($img in ($emrImages + $pacsImages | Select-Object -Unique)) {
  docker image inspect $img 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Say "pulling $img"
    docker pull $img
    if ($LASTEXITCODE -ne 0) { Die "Could not pull $img - check your internet connection." }
  } else {
    Say "have $img"
  }
}

# ---------------------------------------------------------------- assemble
Step "Assembling the kit at $Destination"
$imagesDir = Join-Path $Destination 'images'
New-Item -ItemType Directory -Force -Path $imagesDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Destination 'installers') | Out-Null

# One tar per stack so a clinic that skips imaging can leave the PACS tar behind.
$emrTar = Join-Path $imagesDir 'bethesda-emr-images.tar'
Say "saving EMR images -> $(Split-Path $emrTar -Leaf) (several GB, takes a few minutes)"
docker save -o $emrTar @emrImages
if ($LASTEXITCODE -ne 0) { Die "docker save failed for the EMR images." }

if ($includePacs) {
  $pacsTar = Join-Path $imagesDir 'bethesda-pacs-images.tar'
  Say "saving PACS images -> $(Split-Path $pacsTar -Leaf)"
  docker save -o $pacsTar @pacsImages
  if ($LASTEXITCODE -ne 0) { Die "docker save failed for the PACS images." }
}

# The kit holds the new images now; give this machine its own back.
$restored = 0
foreach ($img in @($before.Keys)) {
  $now = (docker image inspect -f '{{.Id}}' $img 2>$null)
  if ($LASTEXITCODE -eq 0 -and "$now".Trim() -ne $before[$img]) {
    docker tag $before[$img] $img
    if ($LASTEXITCODE -eq 0) { $restored++ } else { Say "could not put $img back on $($before[$img])" }
  }
}
$global:LASTEXITCODE = 0
if ($restored) { Say "put $restored image name(s) back on the images this machine was running" }

# Source tree: everything the installer needs, and nothing that belongs to *this*
# machine. .env especially - shipping our secrets to a clinic would be a real leak,
# and so would a copy of it under another name (.env.bak, prod.env, .env.old).
# .claude holds development worktrees: whole extra copies of the source.
$excludeDirs  = @('.git', '.claude', 'node_modules', 'dist', 'build', 'backups', '_pre-update-backups', 'storage', 'worklists', 'offline')
$excludeFiles = @('.env', '.env.*', '*.env', '*.bak', '*.log')

function Copy-CleanTree([string]$src, [string]$dst) {
  # Not $args - that is an automatic variable in PowerShell.
  $rcArgs = @($src, $dst, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:1', '/W:1')
  $rcArgs += '/XD'; $rcArgs += $excludeDirs
  $rcArgs += '/XF'; $rcArgs += $excludeFiles
  robocopy @rcArgs | Out-Null
  # robocopy uses exit codes as a bitmask; anything under 8 means it succeeded.
  if ($LASTEXITCODE -ge 8) { Die "Copy of $src failed (robocopy $LASTEXITCODE)." }
  $global:LASTEXITCODE = 0
  # The pattern above also drops the template the installer starts from.
  $example = Join-Path $src '.env.example'
  if (Test-Path $example) { Copy-Item $example (Join-Path $dst '.env.example') -Force }
  # Check the result rather than trust the pattern: nothing that looks like an
  # environment file may be in the kit, whatever it was called.
  $leaks = @(Get-ChildItem $dst -Recurse -Force -File -ErrorAction SilentlyContinue |
    Where-Object { ($_.Name -like '.env*' -or $_.Name -like '*.env') -and $_.Name -ne '.env.example' })
  if ($leaks.Count) {
    $names = ($leaks | ForEach-Object { $_.Name }) -join ', '
    $leaks | ForEach-Object { Remove-Item $_.FullName -Force }
    Die "Environment file(s) reached the kit and were removed: $names. Packing stopped - find out why before trying again."
  }
}

# Re-packing over an older kit would merge the two trees and leave files that this
# version deleted. Only the source copies pack.ps1 itself wrote are cleared - the
# images folder and anything you added to installers\ by hand are left alone.
foreach ($old in @('Bethesda-EMR', 'Bethesda-PACS')) {
  $p = Join-Path $Destination $old
  if (Test-Path $p) { Say "clearing previous $old copy"; Remove-Item $p -Recurse -Force }
}

Say "copying EMR source"
Copy-CleanTree $emrRoot (Join-Path $Destination 'Bethesda-EMR')
if ($includePacs) {
  Say "copying PACS source"
  Copy-CleanTree $PacsPath (Join-Path $Destination 'Bethesda-PACS')
}

Say "copying installer scripts"
Copy-Item (Join-Path $PSScriptRoot 'install-offline.ps1')    $Destination -Force
Copy-Item (Join-Path $PSScriptRoot 'install-offline.sh')     $Destination -Force
Copy-Item (Join-Path $emrRoot 'OFFLINE-INSTALL.md')          $Destination -Force
# The kit ships GPL/AGPL binaries (Orthanc above all), and handing over the stick is
# distribution - the licence notice has to travel with them.
Copy-Item (Join-Path $PSScriptRoot 'THIRD-PARTY-NOTICE.md')  $Destination -Force

@"
PUT TWO FILES IN THIS FOLDER BEFORE YOU TRAVEL
==============================================

The clinic machine cannot download either of them, and nothing else in this kit
works without them.

1. Docker Desktop
   https://www.docker.com/products/docker-desktop/          (~600 MB)

2. WSL 2 - the standalone installer
   https://github.com/microsoft/WSL/releases                (~250 MB)
   Take the newest 'wsl.<version>.x64.msi'.

Why the second one: Docker Desktop does NOT bundle WSL. Its default per-user
install supports the WSL 2 backend only and needs WSL 2.1.5 or later; when WSL is
missing it runs 'wsl --install', which downloads from Microsoft. With no internet
that step fails and Docker never starts.

Order on the clinic machine:
  1. Turn on virtualization in the BIOS/UEFI (nothing works without it).
  2. dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
     dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
  3. Reboot.
  4. Install the WSL .msi, then check 'wsl --version'.
  5. Install Docker Desktop, open it once, wait for "Engine running".
  6. Run install-offline.ps1 in the kit folder.

On a Linux or NAS host, ignore all of this and bring your distribution's Docker
Engine packages instead.

See OFFLINE-INSTALL.md section 1b for the same thing with more detail.
"@ | Out-File -FilePath (Join-Path $Destination 'installers\PUT-INSTALLERS-HERE.txt') -Encoding utf8

# ---------------------------------------------------------------- manifest
$allImages = $emrImages + $pacsImages | Select-Object -Unique
$sizes = foreach ($f in Get-ChildItem $imagesDir -Filter *.tar) {
  "  {0,-32} {1,8:N1} GB" -f $f.Name, ($f.Length / 1GB)
}
$manifest = @"
Bethesda offline install kit
============================
Packed:       $(Get-Date -Format 'yyyy-MM-dd HH:mm')
Packed on:    $env:COMPUTERNAME
EMR version:  $emrVersion
EMR commit:   $(Show-RepoState $emrState)
PACS bundled: $(if ($includePacs) { 'yes' } else { 'no' })
$(if ($pacsState) { "PACS commit:  $(Show-RepoState $pacsState)" })

Images in this kit:
$($allImages | ForEach-Object { "  $_" } | Out-String)
Tarballs:
$($sizes -join "`n")

Install instructions: OFFLINE-INSTALL.md
"@
$manifest | Out-File -FilePath (Join-Path $Destination 'MANIFEST.txt') -Encoding utf8

Step "Done"
Write-Host $manifest
Write-Host "Kit is at: $Destination" -ForegroundColor Green
Write-Host "Remaining manual step: put BOTH installers into $Destination\installers\" -ForegroundColor Yellow
Write-Host "  - Docker Desktop      https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
Write-Host "  - WSL 2 (x64 .msi)    https://github.com/microsoft/WSL/releases" -ForegroundColor Yellow
Write-Host "  Docker Desktop does not bundle WSL, and the clinic cannot download one." -ForegroundColor Yellow

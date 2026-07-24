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
# Nothing here touches the running stack: it only builds, saves, and copies.

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

$emrVersion = (Get-Content (Join-Path $emrRoot 'backend\package.json') -Raw | ConvertFrom-Json).version
Say "EMR version $emrVersion"

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

# Source tree: everything the installer needs, and nothing that belongs to *this*
# machine. .env especially - shipping our secrets to a clinic would be a real leak.
$excludeDirs  = @('.git', 'node_modules', 'dist', 'build', 'backups', '_pre-update-backups', 'storage', 'worklists', 'offline')
$excludeFiles = @('.env', '*.log')

function Copy-CleanTree([string]$src, [string]$dst) {
  # Not $args - that is an automatic variable in PowerShell.
  $rcArgs = @($src, $dst, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:1', '/W:1')
  $rcArgs += '/XD'; $rcArgs += $excludeDirs
  $rcArgs += '/XF'; $rcArgs += $excludeFiles
  robocopy @rcArgs | Out-Null
  # robocopy uses exit codes as a bitmask; anything under 8 means it succeeded.
  if ($LASTEXITCODE -ge 8) { Die "Copy of $src failed (robocopy $LASTEXITCODE)." }
  $global:LASTEXITCODE = 0
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
Put the Docker Desktop (or Docker Engine) installer in this folder.

The clinic machine will not be able to download it, and nothing else in this kit
works without Docker. Get it from https://www.docker.com/products/docker-desktop/
while you still have internet, and drop the .exe here.
"@ | Out-File -FilePath (Join-Path $Destination 'installers\PUT-DOCKER-INSTALLER-HERE.txt') -Encoding utf8

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
PACS bundled: $(if ($includePacs) { 'yes' } else { 'no' })

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
Write-Host "Remaining manual step: drop the Docker installer into $Destination\installers\" -ForegroundColor Yellow

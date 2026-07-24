# Install Bethesda EMR (+ PACS) on a machine with no usable internet.
#
# Run this from the kit folder (the USB stick), on the clinic's server machine:
#
#   .\install-offline.ps1
#   .\install-offline.ps1 -InstallRoot D:\    -> installs to D:\Bethesda-EMR
#   .\install-offline.ps1 -NoPacs             -> skip imaging even if it is in the kit
#
# It never downloads anything. If an image is missing it stops and says so, rather
# than quietly trying to reach a registry that is not there.

param(
  [string]$InstallRoot = 'C:\',
  [switch]$NoPacs
)

$ErrorActionPreference = 'Stop'
$kit = $PSScriptRoot

function Say([string]$m) { Write-Host "  $m" }
function Step([string]$m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Die([string]$m) { Write-Host ""; Write-Host "ERROR: $m" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- preflight
Step "Checking Docker"
docker version --format '{{.Server.Version}}' 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Die @"
Docker is not running.

Install it first - the installer is in this kit under 'installers\', because this
machine cannot download it. After installing, open Docker Desktop once, wait for it
to say "Engine running", then run this script again.
"@
}
Say "Docker is up."

# Running the app straight off the USB looks like it works and then breaks the day
# someone unplugs the stick - the database volume and the backups folder live next
# to the compose file. Always install onto a local disk.
if ($kit -like 'F:*' -or $kit -like 'E:*' -or $kit -like 'D:*') {
  Say "Installing from removable media - the app itself will be copied to a local disk."
}

$emrSrc  = Join-Path $kit 'Bethesda-EMR'
$pacsSrc = Join-Path $kit 'Bethesda-PACS'
if (-not (Test-Path $emrSrc)) { Die "This does not look like a kit folder - no 'Bethesda-EMR' inside $kit." }
$includePacs = (-not $NoPacs) -and (Test-Path $pacsSrc)

$emrDst  = Join-Path $InstallRoot 'Bethesda-EMR'
$pacsDst = Join-Path $InstallRoot 'Bethesda-PACS'

# ---------------------------------------------------------------- load images
Step "Loading images into Docker (a few minutes, no network needed)"
$emrTar = Join-Path $kit 'images\bethesda-emr-images.tar'
if (-not (Test-Path $emrTar)) { Die "Missing $emrTar - the kit is incomplete." }
docker load -i $emrTar
if ($LASTEXITCODE -ne 0) { Die "Could not load the EMR images." }

if ($includePacs) {
  $pacsTar = Join-Path $kit 'images\bethesda-pacs-images.tar'
  if (Test-Path $pacsTar) {
    docker load -i $pacsTar
    if ($LASTEXITCODE -ne 0) { Die "Could not load the PACS images." }
  } else {
    Say "No PACS tarball in the kit - skipping imaging."
    $includePacs = $false
  }
}

# ---------------------------------------------------------------- copy source
function Install-Tree([string]$src, [string]$dst, [string]$label) {
  if (Test-Path (Join-Path $dst '.env')) {
    # An existing .env means this machine already has a live install. Overwriting the
    # folder would orphan the database (the secrets would no longer match), so leave it.
    Say "$label is already installed at $dst - keeping it (and its secrets) as is."
    return $false
  }
  Say "copying $label -> $dst"
  robocopy $src $dst /E /NFL /NDL /NJH /NJS /NP /R:1 /W:1 | Out-Null
  if ($LASTEXITCODE -ge 8) { Die "Copy of $label failed (robocopy $LASTEXITCODE)." }
  $global:LASTEXITCODE = 0
  return $true
}

Step "Copying the application to $InstallRoot"
Install-Tree $emrSrc $emrDst 'Bethesda EMR' | Out-Null
if ($includePacs) { Install-Tree $pacsSrc $pacsDst 'Bethesda PACS' | Out-Null }

# ---------------------------------------------------------------- start
Step "Starting Bethesda EMR"
Push-Location $emrDst
& (Join-Path $emrDst 'setup.ps1') -Offline
$emrOk = ($LASTEXITCODE -eq 0)
Pop-Location
if (-not $emrOk) { Die "The EMR did not start. Run 'docker compose logs' in $emrDst to see why." }

if ($includePacs) {
  Step "Starting Bethesda PACS"
  Push-Location $pacsDst
  & (Join-Path $pacsDst 'setup.ps1') -Offline
  Pop-Location
}

# ---------------------------------------------------------------- done
Step "Installed"
Write-Host ""
Write-Host "  EMR   http://localhost:9080   (open it to create the administrator account)"
if ($includePacs) {
  Write-Host "  PACS  http://localhost:9090   (user 'admin', password in $pacsDst\.env)"
}
Write-Host ""
Write-Host "Next, from the go-live checklist in DEPLOYMENT.md:" -ForegroundColor Yellow
Write-Host "  - create the administrator account, then add staff with least privilege"
Write-Host "  - set BACKUP_PATH in $emrDst\.env to a second drive, and restart"
Write-Host "  - turn on 'Start Docker Desktop when you sign in' so it survives a power cut"
if ($includePacs) {
  Write-Host "  - paste the bridge token printed above into Settings -> Order Feed"
}

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
  # Docker Desktop's default install runs on WSL 2 and does not bundle it - when WSL is
  # missing it tries to download one, which is exactly what this machine cannot do. Say
  # which prerequisite is actually missing rather than just "Docker is not running".
  $wslVersion = $null
  try { $wslVersion = (& wsl.exe --version 2>$null) -join ' ' } catch { }
  $hint = if ($wslVersion) {
    "WSL is present. Open Docker Desktop once and wait for it to say `"Engine running`", then run this again."
  } else {
    @"
WSL 2 is missing, and Docker Desktop needs it. It does NOT install WSL for you -
it downloads one, which this machine cannot do.

Install the prerequisites from 'installers\' in this order:
  1. Turn on virtualization in the BIOS/UEFI.
  2. dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
     dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
  3. Reboot.
  4. Install wsl.<version>.x64.msi, then check with: wsl --version
  5. Install Docker Desktop, open it once, wait for "Engine running".
Then run this script again. Full details in OFFLINE-INSTALL.md section 1b.
"@
  }
  Die "Docker is not running.`n`n$hint"
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

# The EMR is up at this point, so a PACS that fails to start does not undo the install:
# say so plainly and carry on, instead of ending with "Installed" as if imaging worked.
$pacsOk = $true
if ($includePacs) {
  Step "Starting Bethesda PACS"
  Push-Location $pacsDst
  & (Join-Path $pacsDst 'setup.ps1') -Offline
  $pacsOk = ($LASTEXITCODE -eq 0)
  Pop-Location
  if (-not $pacsOk) {
    Write-Host ""
    Write-Host "WARNING: the imaging server (PACS) did not start. The EMR is installed and works without it." -ForegroundColor Yellow
    Write-Host "  Run 'docker compose logs' in $pacsDst to see why, fix it, then run setup.ps1 -Offline there again." -ForegroundColor Yellow
  }
}

# ---------------------------------------------------------------- done
Step "Installed"
Write-Host ""
Write-Host "  EMR   http://localhost:9080   (open it to create the administrator account)"
if ($includePacs -and $pacsOk) {
  Write-Host "  PACS  http://localhost:9090   (user 'admin', password in $pacsDst\.env)"
} elseif ($includePacs) {
  Write-Host "  PACS  NOT RUNNING - see the warning above" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Next, from the go-live checklist in DEPLOYMENT.md:" -ForegroundColor Yellow
Write-Host "  - create the administrator account, then add staff with least privilege"
Write-Host "  - set BACKUP_PATH in $emrDst\.env to a second drive, and restart"
Write-Host "  - turn on 'Start Docker Desktop when you sign in' so it survives a power cut"
Write-Host "  - give this machine a fixed IP address; staff PCs open http://<that address>:9080"
Write-Host "  - from another PC check the ports:  Test-NetConnection <that address> -Port 9080"
Write-Host "    (if it fails, allow the port in Windows Firewall on this machine)"
Write-Host "  - if you restore a backup from another machine: do it now, BEFORE the steps below -"
Write-Host "    it brings that machine's accounts, settings and imaging addresses with it"
if ($includePacs -and $pacsOk) {
  Write-Host "  - the PACS setup above pairs itself with the EMR ('paired - nothing to copy')."
  Write-Host "    If it did not say so, run  .\pair-with-emr.ps1  in $pacsDst"
  Write-Host "    After restoring a backup, run it again: the backup carries the old token."
  Write-Host "  - in Settings -> Order Feed set the viewer address to http://<this machine's address>:9090"
  Write-Host "  - check the ports 9090 and 4242 the same way; imaging devices send to 4242"
  Write-Host "  - if 9090 or 4242 will not open:  netsh int ipv4 show dynamicport tcp"
  Write-Host "    must start at 49152 (DEPLOYMENT.md, 'Windows dynamic port range')"
  Write-Host "  - images are NOT in the EMR backup. Set up the nightly copy to an external disk:"
  Write-Host "    in $pacsDst run  .\prepare-backup-disk.ps1  then  .\install-image-backup.ps1"
}

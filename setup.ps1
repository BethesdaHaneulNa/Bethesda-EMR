# First-run setup for Bethesda EMR (Windows).
# Generates a .env with strong random secrets (only if missing), then starts the stack.
# Safe to re-run: it never overwrites an existing .env.
#
#   .\setup.ps1            normal install (builds the images; needs internet)
#   .\setup.ps1 -Offline   use images already loaded from the offline kit; never builds
param([switch]$Offline)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function New-Secret([int]$bytes) {
  $b = New-Object byte[] $bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  return ([System.BitConverter]::ToString($b) -replace '-', '').ToLower()
}

if (-not (Test-Path .env)) {
  Write-Host "First run: generating .env with unique random secrets..."
  @"
DB_PASSWORD=$(New-Secret 24)
JWT_SECRET=$(New-Secret 48)

# Backups are optional. Set a path on another drive to enable, then restart.
#   Windows: BACKUP_PATH=D:\medconnect-backups   NAS: BACKUP_PATH=/volume2/medconnect-backups
BACKUP_PATH=
BACKUP_RETENTION_DAYS=30
BACKUP_TIME=02:00
TZ=Indian/Antananarivo
"@ | Out-File -FilePath .env -Encoding ascii
  Write-Host ".env created with unique secrets (kept private - never commit it)."
} else {
  Write-Host ".env already exists - keeping current secrets."
}

if ($Offline) {
  # --no-build fails loudly if an image is missing, instead of quietly reaching for
  # the internet that an offline site does not have.
  Write-Host "Offline mode: starting from pre-loaded images (no build, no downloads)."
  docker compose up -d --no-build
} else {
  docker compose up -d --build
}

Write-Host ""
Write-Host "Bethesda EMR is starting at http://localhost:9080"
Write-Host "Open it in a browser to create your administrator account."

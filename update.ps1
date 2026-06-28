# One-click update for Bethesda EMR (Windows).
# Backs up the database, updates to the latest released version, rebuilds, and verifies.
# Your data is never touched until a backup has been made.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Write-Host "=== Bethesda EMR - Update ===" -ForegroundColor Cyan

# 1) Safety backup (always, regardless of the BACKUP_PATH setting)
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
New-Item -ItemType Directory -Force -Path "_pre-update-backups" | Out-Null
$backup = "_pre-update-backups\preupdate_$stamp.sql.gz"
Write-Host "[1/4] Backing up the database -> $backup"
docker exec bethesda-emr-db sh -c "pg_dump -U medconnect -d medconnect --no-owner --clean --if-exists | gzip > /tmp/_preupdate.sql.gz"
docker cp bethesda-emr-db:/tmp/_preupdate.sql.gz $backup
docker exec bethesda-emr-db rm -f /tmp/_preupdate.sql.gz
Write-Host ("      saved ({0:N1} KB)" -f ((Get-Item $backup).Length / 1KB))

# 2) Get the latest released code
Write-Host "[2/4] Downloading the latest version..."
git fetch origin --tags --quiet
$tag = git tag --sort=-v:refname | Select-Object -First 1
if ($tag) { git checkout --quiet $tag; Write-Host "      -> $tag" }
else { git pull --ff-only origin main }

# 3) Rebuild & restart
Write-Host "[3/4] Rebuilding and restarting (this can take a few minutes)..."
docker compose up -d --build
docker restart bethesda-emr-web | Out-Null

# 4) Verify
Write-Host "[4/4] Verifying..."
Start-Sleep -Seconds 8
$ok = $false
for ($i = 0; $i -lt 15; $i++) {
  try { if ((Invoke-RestMethod 'http://localhost:8080/api/health' -TimeoutSec 3).status -eq 'ok') { $ok = $true; break } } catch {}
  Start-Sleep -Seconds 3
}
if ($ok) { Write-Host "`n[OK] Update complete - Bethesda EMR is running at http://localhost:8080" -ForegroundColor Green }
else { Write-Host "`n[!] Health check did not pass. Your data is safe. To restore if needed:`n    $backup`n    (see DEPLOYMENT.md - Restore)" -ForegroundColor Yellow }

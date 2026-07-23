# One-click update for Bethesda EMR (Windows).
# Backs up the database, gets the latest version (via git if present, otherwise by downloading
# the latest release), rebuilds, and verifies. Your data and .env are preserved.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$repo = 'BethesdaHaneulNa/Bethesda-EMR'
Write-Host "=== Bethesda EMR - Update ===" -ForegroundColor Cyan

# Is Docker running?
docker info *> $null
if ($LASTEXITCODE -ne 0) { Write-Host "[!] Start Docker Desktop first, then run this again." -ForegroundColor Yellow; pause; exit 1 }

# 1) Safety backup (always)
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
New-Item -ItemType Directory -Force -Path "_pre-update-backups" | Out-Null
$backup = "_pre-update-backups\preupdate_$stamp.sql.gz"
Write-Host "[1/4] Backing up the database -> $backup"
docker exec bethesda-emr-db sh -c "pg_dump -U medconnect -d medconnect --no-owner --clean --if-exists | gzip > /tmp/_preupdate.sql.gz"
docker cp bethesda-emr-db:/tmp/_preupdate.sql.gz $backup
docker exec bethesda-emr-db rm -f /tmp/_preupdate.sql.gz

# 2) Get the latest version
Write-Host "[2/4] Getting the latest version..."
if (Test-Path ".git") {
  git fetch origin --tags --quiet
  $tag = git tag --sort=-v:refname | Select-Object -First 1
  if ($tag) { git checkout --quiet $tag; Write-Host "      -> $tag (git)" } else { git pull --ff-only origin main }
} else {
  $rel = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest" -Headers @{ 'User-Agent' = 'Bethesda-EMR' }
  $tag = $rel.tag_name
  Write-Host "      -> $tag (download)"
  $tmp = Join-Path $env:TEMP "bethesda-update"
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $zip = Join-Path $tmp "src.zip"
  Invoke-WebRequest "https://github.com/$repo/archive/refs/tags/$tag.zip" -OutFile $zip -UseBasicParsing
  Expand-Archive $zip -DestinationPath $tmp -Force
  $src = (Get-ChildItem $tmp -Directory | Select-Object -First 1).FullName
  # copy new files over the current folder, but keep .env, backups, and pre-update backups
  robocopy $src $PSScriptRoot /E /NFL /NDL /NJH /NJS /NP /XF ".env" /XD "backups" "_pre-update-backups" ".git" | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Copying updated files failed (robocopy $LASTEXITCODE)" }
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}

# 3) Rebuild & restart
Write-Host "[3/4] Rebuilding and restarting (this can take a few minutes)..."
docker compose up -d --build
docker restart bethesda-emr-web | Out-Null

# 4) Verify
Write-Host "[4/4] Verifying..."
Start-Sleep -Seconds 8
$ok = $false
for ($i = 0; $i -lt 15; $i++) {
  try { if ((Invoke-RestMethod 'http://localhost:9080/api/health' -TimeoutSec 3).status -eq 'ok') { $ok = $true; break } } catch {}
  Start-Sleep -Seconds 3
}
if ($ok) { Write-Host "`n[OK] Update complete - Bethesda EMR is running at http://localhost:9080" -ForegroundColor Green }
else { Write-Host "`n[!] Health check did not pass. Your data is safe. To restore if needed:`n    $backup`n    (see DEPLOYMENT.md - Restore)" -ForegroundColor Yellow }

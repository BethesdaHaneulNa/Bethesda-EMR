#!/bin/sh
# One-click update for Bethesda EMR (Linux / macOS / NAS).
# Backs up the database, updates to the latest released version, rebuilds, and verifies.
# Your data is never touched until a backup has been made.
set -e
cd "$(dirname "$0")"
echo "=== Bethesda EMR - Update ==="

# 1) Safety backup (always)
stamp=$(date +%Y-%m-%d_%H%M)
mkdir -p _pre-update-backups
backup="_pre-update-backups/preupdate_$stamp.sql.gz"
echo "[1/4] Backing up the database -> $backup"
docker exec bethesda-emr-db sh -c "pg_dump -U medconnect -d medconnect --no-owner --clean --if-exists | gzip > /tmp/_preupdate.sql.gz"
docker cp bethesda-emr-db:/tmp/_preupdate.sql.gz "$backup"
docker exec bethesda-emr-db rm -f /tmp/_preupdate.sql.gz

# 2) Get the latest released code
echo "[2/4] Downloading the latest version..."
git fetch origin --tags --quiet 2>/dev/null || git fetch origin --tags
tag=$(git tag --sort=-v:refname | head -n1)
if [ -n "$tag" ]; then git checkout --quiet "$tag"; echo "      -> $tag"; else git pull --ff-only origin main; fi

# 3) Rebuild & restart
echo "[3/4] Rebuilding and restarting (this can take a few minutes)..."
docker compose up -d --build
docker restart bethesda-emr-web >/dev/null 2>&1 || true

# 4) Verify
echo "[4/4] Verifying..."
sleep 8
ok=0; i=0
while [ $i -lt 15 ]; do
  if curl -fs http://localhost:8080/api/health >/dev/null 2>&1; then ok=1; break; fi
  sleep 3; i=$((i + 1))
done
if [ "$ok" = "1" ]; then
  echo ""
  echo "[OK] Update complete - Bethesda EMR is running at http://localhost:8080"
else
  echo ""
  echo "[!] Health check did not pass. Your data is safe; restore from $backup if needed (see DEPLOYMENT.md)."
fi

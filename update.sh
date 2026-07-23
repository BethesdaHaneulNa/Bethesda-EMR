#!/bin/sh
# One-click update for Bethesda EMR (Linux / macOS / NAS).
# Backs up the database, gets the latest version (via git if present, otherwise by downloading
# the latest release), rebuilds, and verifies. Your data and .env are preserved.
set -e
cd "$(dirname "$0")"
REPO="BethesdaHaneulNa/Bethesda-EMR"
echo "=== Bethesda EMR - Update ==="

# 1) Safety backup (always)
stamp=$(date +%Y-%m-%d_%H%M)
mkdir -p _pre-update-backups
backup="_pre-update-backups/preupdate_$stamp.sql.gz"
echo "[1/4] Backing up the database -> $backup"
docker exec bethesda-emr-db sh -c "pg_dump -U medconnect -d medconnect --no-owner --clean --if-exists | gzip > /tmp/_preupdate.sql.gz"
docker cp bethesda-emr-db:/tmp/_preupdate.sql.gz "$backup"
docker exec bethesda-emr-db rm -f /tmp/_preupdate.sql.gz

# 2) Get the latest version
echo "[2/4] Getting the latest version..."
if [ -d ".git" ]; then
  git fetch origin --tags --quiet 2>/dev/null || git fetch origin --tags
  tag=$(git tag --sort=-v:refname | head -n1)
  if [ -n "$tag" ]; then git checkout --quiet "$tag"; echo "      -> $tag (git)"; else git pull --ff-only origin main; fi
else
  tag=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep -m1 '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')
  echo "      -> $tag (download)"
  command -v unzip >/dev/null 2>&1 || { echo "[!] Need git or unzip to update. Please install one."; exit 1; }
  tmp=$(mktemp -d)
  curl -fsSL "https://github.com/$REPO/archive/refs/tags/$tag.zip" -o "$tmp/src.zip"
  unzip -q "$tmp/src.zip" -d "$tmp"
  src=$(find "$tmp" -mindepth 1 -maxdepth 1 -type d | head -n1)
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --exclude='.env' --exclude='backups' --exclude='_pre-update-backups' --exclude='.git' "$src"/ ./
  else
    cp -f "$PWD/.env" "$tmp/.env.keep" 2>/dev/null || true
    cp -R "$src"/. ./
    cp -f "$tmp/.env.keep" "$PWD/.env" 2>/dev/null || true
  fi
  rm -rf "$tmp"
fi

# 3) Rebuild & restart
echo "[3/4] Rebuilding and restarting (this can take a few minutes)..."
docker compose up -d --build
docker restart bethesda-emr-web >/dev/null 2>&1 || true

# 4) Verify
echo "[4/4] Verifying..."
sleep 8
ok=0; i=0
while [ $i -lt 15 ]; do
  if curl -fs http://localhost:9080/api/health >/dev/null 2>&1; then ok=1; break; fi
  sleep 3; i=$((i + 1))
done
if [ "$ok" = "1" ]; then
  echo ""
  echo "[OK] Update complete - Bethesda EMR is running at http://localhost:9080"
else
  echo ""
  echo "[!] Health check did not pass. Your data is safe; restore from $backup if needed (see DEPLOYMENT.md)."
fi

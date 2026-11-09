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
echo "[1/5] Backing up the database -> $backup"
# pipefail is what makes `set -e` above actually fire here: a pipeline reports the
# status of its last command, so without it a failed pg_dump exits 0 (gzip was fine)
# and we would update on top of an empty safety backup. gzip -t proves it is whole.
docker exec bethesda-emr-db sh -c "set -o pipefail; pg_dump -U medconnect -d medconnect --no-owner --clean --if-exists | gzip > /tmp/_preupdate.sql.gz && gzip -t /tmp/_preupdate.sql.gz"
docker cp bethesda-emr-db:/tmp/_preupdate.sql.gz "$backup"
docker exec bethesda-emr-db rm -f /tmp/_preupdate.sql.gz
if [ ! -s "$backup" ]; then
  echo "[!] Safety backup is missing or empty - update aborted. Nothing has been changed."
  exit 1
fi

# 2) Get the latest version
echo "[2/5] Getting the latest version..."
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
echo "[3/5] Rebuilding and restarting (this can take a few minutes)..."
docker compose up -d --build
docker restart bethesda-emr-web >/dev/null 2>&1 || true

# 4) Verify
echo "[4/5] Verifying..."
sleep 8
ok=0; i=0
while [ $i -lt 15 ]; do
  if curl -fs http://localhost:9080/api/health >/dev/null 2>&1; then ok=1; break; fi
  sleep 3; i=$((i + 1))
done
if [ "$ok" != "1" ]; then
  echo ""
  echo "[!] Health check did not pass. Your data is safe; restore from $backup if needed (see DEPLOYMENT.md)."
  exit 1
fi

# 5) A backup of the database as it is now. The one taken in step 1 is of the old
# version, and a backup restores with the usual steps only onto the version that made
# it (DEPLOYMENT.md 5b): without this, until tonight's automatic backup every backup
# here would be older than the app. Made by the app's own backup code, so it has the
# usual name and place and appears in Settings > Backup.
echo "[5/5] Backing up the updated database..."
echo ""
if post=$(docker exec bethesda-emr-api node src/services/backup-cli.js update); then
  echo "      -> $post"
  echo "[OK] Update complete - Bethesda EMR is running at http://localhost:9080"
else
  echo "[OK] Update complete - Bethesda EMR is running at http://localhost:9080"
  echo "[!] But the backup after the update failed. Open Settings > Backup and press 'Back up now' (Sauvegarder)."
fi

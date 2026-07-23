#!/bin/sh
# First-run setup for Bethesda EMR.
# Generates a .env with strong random secrets (only if missing), then starts the stack.
# Safe to re-run: it never overwrites an existing .env.
set -e
cd "$(dirname "$0")"

gen() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$1"
  else
    LC_ALL=C tr -dc 'a-f0-9' < /dev/urandom | head -c "$(( $1 * 2 ))"
  fi
}

if [ ! -f .env ]; then
  echo "First run: generating .env with unique random secrets..."
  {
    echo "DB_PASSWORD=$(gen 24)"
    echo "JWT_SECRET=$(gen 48)"
    echo ""
    echo "# Backups are optional. Set a path on another drive to enable, then restart."
    echo "#   Windows: BACKUP_PATH=D:\\medconnect-backups   NAS: BACKUP_PATH=/volume2/medconnect-backups"
    echo "BACKUP_PATH="
    echo "BACKUP_RETENTION_DAYS=30"
    echo "BACKUP_TIME=02:00"
    echo "TZ=Indian/Antananarivo"
  } > .env
  echo ".env created with unique secrets (kept private — never commit it)."
else
  echo ".env already exists — keeping current secrets."
fi

docker compose up -d --build

echo ""
echo "Bethesda EMR is starting at http://localhost:9080"
echo "Open it in a browser to create your administrator account."

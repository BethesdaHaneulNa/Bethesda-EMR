#!/bin/sh
# Build an offline install kit for Bethesda EMR (+ optional PACS).
#
# Run this ON A MACHINE WITH GOOD INTERNET (i.e. before you travel). It builds every
# image, saves them to a tarball, copies a clean source tree next to them, and leaves
# a self-contained folder you can hand to a clinic that has no usable connection.
#
#   ./offline/pack.sh                     -> ./bethesda-offline-kit
#   ./offline/pack.sh /media/usb/kit      -> that folder
#   NO_PACS=1 ./offline/pack.sh           -> EMR only
#   PACS_PATH=/srv/Bethesda-PACS ./offline/pack.sh
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"
EMR_ROOT="$(dirname "$HERE")"
DEST="${1:-$(dirname "$EMR_ROOT")/bethesda-offline-kit}"
PACS_PATH="${PACS_PATH:-$(dirname "$EMR_ROOT")/Bethesda-PACS-main}"

say()  { echo "  $*"; }
step() { echo ""; echo "==> $*"; }
die()  { echo "ERROR: $*" >&2; exit 1; }

step "Checking Docker"
docker version >/dev/null 2>&1 || die "Docker is not running."
say "Docker is up."

INCLUDE_PACS=1
[ -n "$NO_PACS" ] && INCLUDE_PACS=""
if [ -n "$INCLUDE_PACS" ] && [ ! -f "$PACS_PATH/docker-compose.yml" ]; then
  say "No PACS repo at $PACS_PATH - packing EMR only."
  INCLUDE_PACS=""
fi

# compose refuses to parse the file with JWT_SECRET unset (deliberate - see
# docker-compose.yml). The build never reads it, so a throwaway value is enough.
[ -f "$EMR_ROOT/.env" ] || export JWT_SECRET="pack-time-placeholder-not-used-at-runtime"

EMR_VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$EMR_ROOT/backend/package.json" | head -1)"
say "EMR version $EMR_VERSION"

step "Building EMR images (this is the slow part)"
EMR_IMAGES="$(cd "$EMR_ROOT" && docker compose build >&2 && docker compose config --images)"
say "$(echo "$EMR_IMAGES" | tr '\n' ' ')"

PACS_IMAGES=""
if [ -n "$INCLUDE_PACS" ]; then
  step "Building PACS images"
  PACS_IMAGES="$(cd "$PACS_PATH" && docker compose build >&2 && docker compose config --images)"
  say "$(echo "$PACS_IMAGES" | tr '\n' ' ')"
fi

# Base images (postgres, orthanc) are referenced but not built - pull whatever we
# do not already have locally.
step "Fetching base images"
for img in $EMR_IMAGES $PACS_IMAGES; do
  if docker image inspect "$img" >/dev/null 2>&1; then
    say "have $img"
  else
    say "pulling $img"
    docker pull "$img" || die "Could not pull $img - check your internet connection."
  fi
done

step "Assembling the kit at $DEST"
mkdir -p "$DEST/images" "$DEST/installers"

say "saving EMR images (several GB, takes a few minutes)"
# shellcheck disable=SC2086
docker save -o "$DEST/images/bethesda-emr-images.tar" $EMR_IMAGES || die "docker save failed for the EMR images."
if [ -n "$INCLUDE_PACS" ]; then
  say "saving PACS images"
  # shellcheck disable=SC2086
  docker save -o "$DEST/images/bethesda-pacs-images.tar" $PACS_IMAGES || die "docker save failed for the PACS images."
fi

# Source tree: everything the installer needs, and nothing that belongs to *this*
# machine. .env especially - shipping our secrets to a clinic would be a real leak.
copy_clean() {
  src="$1"; dst="$2"
  mkdir -p "$dst"
  tar -C "$src" \
    --exclude=.git --exclude=node_modules --exclude=dist --exclude=build \
    --exclude=backups --exclude=_pre-update-backups --exclude=storage \
    --exclude=worklists --exclude=offline --exclude=.env --exclude='*.log' \
    -cf - . | tar -C "$dst" -xf -
}

# Re-packing over an older kit would merge the two trees and leave files that this
# version deleted. Only the source copies pack.sh itself wrote are cleared - the
# images folder and anything you added to installers/ by hand are left alone.
for old in Bethesda-EMR Bethesda-PACS; do
  [ -d "$DEST/$old" ] && { say "clearing previous $old copy"; rm -rf "${DEST:?}/$old"; }
done

say "copying EMR source"
copy_clean "$EMR_ROOT" "$DEST/Bethesda-EMR"
if [ -n "$INCLUDE_PACS" ]; then
  say "copying PACS source"
  copy_clean "$PACS_PATH" "$DEST/Bethesda-PACS"
fi

say "copying installer scripts"
# THIRD-PARTY-NOTICE.md: the kit ships GPL/AGPL binaries (Orthanc above all), and
# handing over the stick is distribution - the licence notice has to travel with them.
cp "$HERE/install-offline.sh" "$HERE/install-offline.ps1" "$HERE/THIRD-PARTY-NOTICE.md" \
   "$EMR_ROOT/OFFLINE-INSTALL.md" "$DEST/"
chmod +x "$DEST/install-offline.sh" 2>/dev/null || true

cat > "$DEST/installers/PUT-DOCKER-INSTALLER-HERE.txt" <<'EOF'
Put the Docker Desktop (or Docker Engine) installer in this folder.

The clinic machine will not be able to download it, and nothing else in this kit
works without Docker. Get it from https://www.docker.com/products/docker-desktop/
while you still have internet, and drop the installer here.
EOF

cat > "$DEST/MANIFEST.txt" <<EOF
Bethesda offline install kit
============================
Packed:       $(date '+%Y-%m-%d %H:%M')
Packed on:    $(hostname)
EMR version:  $EMR_VERSION
PACS bundled: $([ -n "$INCLUDE_PACS" ] && echo yes || echo no)

Images in this kit:
$(for i in $EMR_IMAGES $PACS_IMAGES; do echo "  $i"; done)

Tarballs:
$(cd "$DEST/images" && ls -lh *.tar | awk '{printf "  %-32s %8s\n", $9, $5}')

Install instructions: OFFLINE-INSTALL.md
EOF

step "Done"
cat "$DEST/MANIFEST.txt"
echo "Kit is at: $DEST"
echo "Remaining manual step: drop the Docker installer into $DEST/installers/"

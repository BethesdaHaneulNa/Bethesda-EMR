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
#
# The running containers are not touched. Building does move the image names onto the
# freshly built images, so once the images are saved the names are put back on the
# images they pointed to before. Pack from the state you mean to ship: MANIFEST.txt
# records both commits, and says so if anything was uncommitted.
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

# Same for the PACS compose file: placeholders let it parse on a machine with no .env.
if [ -n "$INCLUDE_PACS" ] && [ ! -f "$PACS_PATH/.env" ]; then
  export ORTHANC_PASSWORD="${ORTHANC_PASSWORD:-pack-time-placeholder-not-used-at-runtime}"
  export BRIDGE_TOKEN="${BRIDGE_TOKEN:-pack-time-placeholder-not-used-at-runtime}"
fi

# Which commit is being packed, and whether anything is uncommitted.
repo_state() {
  if [ -e "$1/.git" ] && c="$(git -C "$1" rev-parse --short HEAD 2>/dev/null)"; then
    b="$(git -C "$1" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
    d=""
    [ -n "$(git -C "$1" status --porcelain 2>/dev/null)" ] && d="  ** PACKED WITH UNCOMMITTED CHANGES **"
    echo "$c ($b)$d"
  else
    echo "not a git checkout"
  fi
}
EMR_STATE="$(repo_state "$EMR_ROOT")"
say "EMR  commit $EMR_STATE"
PACS_STATE=""
if [ -n "$INCLUDE_PACS" ]; then
  PACS_STATE="$(repo_state "$PACS_PATH")"
  say "PACS commit $PACS_STATE"
fi

# Where each image name points now ("name id" per line), to put it back afterwards.
image_ids() {
  (cd "$1" && docker compose config --images) | while read -r img; do
    [ -n "$img" ] || continue
    if id="$(docker image inspect -f '{{.Id}}' "$img" 2>/dev/null)"; then echo "$img $id"; fi
  done
  return 0
}
BEFORE="$(image_ids "$EMR_ROOT")"
if [ -n "$INCLUDE_PACS" ]; then
  BEFORE="$BEFORE
$(image_ids "$PACS_PATH")"
fi

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

# The kit holds the new images now; give this machine its own back.
echo "$BEFORE" | while read -r img id; do
  [ -n "$img" ] && [ -n "$id" ] || continue
  now="$(docker image inspect -f '{{.Id}}' "$img" 2>/dev/null || true)"
  if [ -n "$now" ] && [ "$now" != "$id" ]; then
    docker tag "$id" "$img" && say "put $img back on the image this machine was running"
  fi
done

# Source tree: everything the installer needs, and nothing that belongs to *this*
# machine. .env especially - shipping our secrets to a clinic would be a real leak,
# and so would a copy of it under another name (.env.bak, prod.env, .env.old).
# .claude holds development worktrees: whole extra copies of the source.
copy_clean() {
  src="$1"; dst="$2"
  mkdir -p "$dst"
  tar -C "$src" \
    --exclude=.git --exclude=.claude --exclude=node_modules --exclude=dist --exclude=build \
    --exclude=backups --exclude=_pre-update-backups --exclude=storage \
    --exclude=worklists --exclude=logs --exclude=offline \
    --exclude=.env --exclude='.env.*' --exclude='*.env' --exclude='*.bak' --exclude='*.log' \
    --exclude=KEEP-TEST-DATA.txt \
    -cf - . | tar -C "$dst" -xf -
  # The pattern above also drops the template the installer starts from.
  if [ -f "$src/.env.example" ]; then cp "$src/.env.example" "$dst/.env.example"; fi
  # Check the result rather than trust the pattern.
  leaks="$(find "$dst" -type f \( -name '.env*' -o -name '*.env' \) ! -name '.env.example' 2>/dev/null || true)"
  if [ -n "$leaks" ]; then
    echo "$leaks" | while read -r f; do rm -f "$f"; done
    die "Environment file(s) reached the kit and were removed: $(echo "$leaks" | tr '\n' ' '). Packing stopped - find out why before trying again."
  fi
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

cat > "$DEST/installers/PUT-INSTALLERS-HERE.txt" <<'EOF'
PUT TWO FILES IN THIS FOLDER BEFORE YOU TRAVEL
==============================================

The clinic machine cannot download either of them, and nothing else in this kit
works without them.

1. Docker Desktop
   https://www.docker.com/products/docker-desktop/          (~600 MB)

2. WSL 2 - the standalone installer
   https://github.com/microsoft/WSL/releases                (~250 MB)
   Take the newest 'wsl.<version>.x64.msi'.

Why the second one: Docker Desktop does NOT bundle WSL. Its default per-user
install supports the WSL 2 backend only and needs WSL 2.1.5 or later; when WSL is
missing it runs 'wsl --install', which downloads from Microsoft. With no internet
that step fails and Docker never starts.

Order on the clinic machine:
  1. Turn on virtualization in the BIOS/UEFI (nothing works without it).
  2. dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
     dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
  3. Reboot.
  4. Install the WSL .msi, then check 'wsl --version'.
  5. Install Docker Desktop, open it once, wait for "Engine running".
  6. Run install-offline.ps1 in the kit folder.

On a Linux or NAS host, ignore all of this and bring your distribution's Docker
Engine packages instead.

See OFFLINE-INSTALL.md section 1b for the same thing with more detail.
EOF

cat > "$DEST/MANIFEST.txt" <<EOF
Bethesda offline install kit
============================
Packed:       $(date '+%Y-%m-%d %H:%M')
Packed on:    $(hostname)
EMR version:  $EMR_VERSION
EMR commit:   $EMR_STATE
PACS bundled: $([ -n "$INCLUDE_PACS" ] && echo yes || echo no)
$([ -n "$INCLUDE_PACS" ] && echo "PACS commit:  $PACS_STATE" || true)

Images in this kit:
$(for i in $EMR_IMAGES $PACS_IMAGES; do echo "  $i"; done)

Tarballs:
$(cd "$DEST/images" && ls -lh *.tar | awk '{printf "  %-32s %8s\n", $9, $5}')

Install instructions: OFFLINE-INSTALL.md
EOF

step "Done"
cat "$DEST/MANIFEST.txt"
echo "Kit is at: $DEST"
echo "Remaining manual step: put BOTH installers into $DEST/installers/"
echo "  - Docker Desktop      https://www.docker.com/products/docker-desktop/"
echo "  - WSL 2 (x64 .msi)    https://github.com/microsoft/WSL/releases"
echo "  Docker Desktop does not bundle WSL, and the clinic cannot download one."

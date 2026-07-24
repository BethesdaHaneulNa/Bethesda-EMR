#!/bin/sh
# Install Bethesda EMR (+ PACS) on a machine with no usable internet.
#
# Run this from the kit folder (the USB stick), on the clinic's server machine:
#
#   sh install-offline.sh
#   sh install-offline.sh /opt        -> installs to /opt/Bethesda-EMR
#   NO_PACS=1 sh install-offline.sh   -> skip imaging even if it is in the kit
#
# It never downloads anything. If an image is missing it stops and says so, rather
# than quietly trying to reach a registry that is not there.
#
# (Invoke it with `sh` - kits are usually handed over on exFAT/FAT media, which
# cannot store the executable bit.)
set -e

KIT="$(cd "$(dirname "$0")" && pwd)"
INSTALL_ROOT="${1:-/opt}"

say()  { echo "  $*"; }
step() { echo ""; echo "==> $*"; }
die()  { echo ""; echo "ERROR: $*" >&2; exit 1; }

step "Checking Docker"
if ! docker version >/dev/null 2>&1; then
  die "Docker is not running.

Install it first - the installer is in this kit under 'installers/', because this
machine cannot download it. Then start Docker and run this script again."
fi
say "Docker is up."

EMR_SRC="$KIT/Bethesda-EMR"
PACS_SRC="$KIT/Bethesda-PACS"
[ -d "$EMR_SRC" ] || die "This does not look like a kit folder - no 'Bethesda-EMR' inside $KIT."

INCLUDE_PACS=1
[ -n "$NO_PACS" ] && INCLUDE_PACS=""
[ -d "$PACS_SRC" ] || INCLUDE_PACS=""

EMR_DST="$INSTALL_ROOT/Bethesda-EMR"
PACS_DST="$INSTALL_ROOT/Bethesda-PACS"

step "Loading images into Docker (a few minutes, no network needed)"
[ -f "$KIT/images/bethesda-emr-images.tar" ] || die "Missing images/bethesda-emr-images.tar - the kit is incomplete."
docker load -i "$KIT/images/bethesda-emr-images.tar" || die "Could not load the EMR images."

if [ -n "$INCLUDE_PACS" ]; then
  if [ -f "$KIT/images/bethesda-pacs-images.tar" ]; then
    docker load -i "$KIT/images/bethesda-pacs-images.tar" || die "Could not load the PACS images."
  else
    say "No PACS tarball in the kit - skipping imaging."
    INCLUDE_PACS=""
  fi
fi

# Running the app straight off the USB looks like it works and then breaks the day
# someone unplugs the stick - the database volume and the backups folder live next
# to the compose file. Always install onto a local disk.
install_tree() {
  src="$1"; dst="$2"; label="$3"
  if [ -f "$dst/.env" ]; then
    # An existing .env means a live install. Overwriting would orphan the database
    # (the secrets would no longer match), so leave it alone.
    say "$label is already installed at $dst - keeping it (and its secrets) as is."
    return 0
  fi
  say "copying $label -> $dst"
  mkdir -p "$dst"
  tar -C "$src" -cf - . | tar -C "$dst" -xf -
  chmod +x "$dst/setup.sh" "$dst/update.sh" 2>/dev/null || true
}

step "Copying the application to $INSTALL_ROOT"
install_tree "$EMR_SRC" "$EMR_DST" "Bethesda EMR"
[ -n "$INCLUDE_PACS" ] && install_tree "$PACS_SRC" "$PACS_DST" "Bethesda PACS"

step "Starting Bethesda EMR"
(cd "$EMR_DST" && sh ./setup.sh --offline) || die "The EMR did not start. Run 'docker compose logs' in $EMR_DST to see why."

if [ -n "$INCLUDE_PACS" ]; then
  step "Starting Bethesda PACS"
  (cd "$PACS_DST" && sh ./setup.sh --offline)
fi

step "Installed"
echo ""
echo "  EMR   http://localhost:9080   (open it to create the administrator account)"
[ -n "$INCLUDE_PACS" ] && echo "  PACS  http://localhost:9090   (user 'admin', password in $PACS_DST/.env)"
echo ""
echo "Next, from the go-live checklist in DEPLOYMENT.md:"
echo "  - create the administrator account, then add staff with least privilege"
echo "  - set BACKUP_PATH in $EMR_DST/.env to a second drive, and restart"
[ -n "$INCLUDE_PACS" ] && echo "  - paste the bridge token printed above into Settings -> Order Feed"
exit 0

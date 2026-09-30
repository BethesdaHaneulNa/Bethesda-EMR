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

# The EMR is up at this point, so a PACS that fails to start does not undo the install:
# say so plainly and carry on, instead of ending with "Installed" as if imaging worked
# (or, under set -e, stopping here without a word).
PACS_OK=1
if [ -n "$INCLUDE_PACS" ]; then
  step "Starting Bethesda PACS"
  if ! (cd "$PACS_DST" && sh ./setup.sh --offline); then
    PACS_OK=""
    echo ""
    echo "WARNING: the imaging server (PACS) did not start. The EMR is installed and works without it."
    echo "  Run 'docker compose logs' in $PACS_DST to see why, fix it, then run 'sh ./setup.sh --offline' there again."
  fi
fi

step "Installed"
echo ""
echo "  EMR   http://localhost:9080   (open it to create the administrator account)"
if [ -n "$INCLUDE_PACS" ] && [ -n "$PACS_OK" ]; then
  echo "  PACS  http://localhost:9090   (user 'admin', password in $PACS_DST/.env)"
elif [ -n "$INCLUDE_PACS" ]; then
  echo "  PACS  NOT RUNNING - see the warning above"
fi
echo ""
echo "Next, from the go-live checklist in DEPLOYMENT.md:"
echo "  - create the administrator account, then add staff with least privilege"
echo "  - backups: the EMR backs itself up every night into $EMR_DST/backups (nothing to set in .env);"
echo "    copy them to another disk - the image backup scripts are Windows-only for now"
echo "  - give this machine a fixed IP address; staff PCs open http://<that address>:9080"
echo "  - from another PC check that port 9080 opens (and the firewall lets it through)"
echo "  - if you restore a backup from another machine: do it now, BEFORE the steps below -"
echo "    it brings that machine's accounts, settings and imaging addresses with it"
if [ -n "$INCLUDE_PACS" ] && [ -n "$PACS_OK" ]; then
  echo "  - the PACS setup above pairs itself with the EMR ('paired - nothing to copy')."
  echo "    If it did not say so, run  sh ./pair-with-emr.sh  in $PACS_DST"
  echo "    After restoring a backup, run it again: the backup carries the old token."
  echo "  - the image window needs no address: the EMR shows the images itself. Port 9090 is for"
  echo "    this machine only; imaging devices use 4242"
  echo "  - check the ports 9090 and 4242 the same way; imaging devices send to 4242"
  echo "  - images are NOT in the EMR backup. The nightly copy to an external disk is set up"
  echo "    with the scripts in $PACS_DST (Windows only for now - see the PACS README)"
fi
exit 0

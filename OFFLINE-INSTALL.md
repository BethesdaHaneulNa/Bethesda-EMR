# Offline Install Kit

Installing Bethesda EMR normally downloads well over a gigabyte: the Postgres, Node and
nginx base images, every npm package, and (if you use imaging) Orthanc. On a fast
connection that is a few minutes. On a slow or intermittent one it can take a day, or
fail halfway and leave a half-built stack that is hard to diagnose on site.

The offline kit removes that step entirely. You build everything **before you travel**,
put it on a USB stick, and the clinic install runs with the network unplugged.

---

## 1. Before you travel — build the kit

On a machine with Docker and good internet, with both repos checked out side by side:

**Windows**
```powershell
cd C:\Bethesda-EMR-main
.\offline\pack.ps1                      # writes F:\bethesda-offline-kit
.\offline\pack.ps1 -Destination E:\kit  # somewhere else
.\offline\pack.ps1 -NoPacs              # EMR only, no imaging
```

**Linux / macOS**
```bash
./offline/pack.sh /media/usb/bethesda-offline-kit
NO_PACS=1 ./offline/pack.sh             # EMR only
```

It builds both stacks, pulls the base images, and writes:

```
bethesda-offline-kit/
  MANIFEST.txt                 what is in here, and which version
  OFFLINE-INSTALL.md           this file
  THIRD-PARTY-NOTICE.md        licences of the bundled images — keep it on the stick
  install-offline.ps1          run this on the clinic machine (Windows)
  install-offline.sh           run this on the clinic machine (Linux / NAS)
  images/
    bethesda-emr-images.tar    postgres + backend + frontend
    bethesda-pacs-images.tar   orthanc + worklist bridge
  Bethesda-EMR/                clean source tree (no .env, no backups)
  Bethesda-PACS/
  installers/                  ← put the Docker installer here yourself
```

**One manual step remains:** fill `installers/` yourself — see the next section. Nothing
in the kit works without Docker, and the clinic machine cannot download it.

Budget roughly 4–6 GB on the stick. Use exFAT or NTFS — FAT32 cannot hold a file over
4 GB and the image tarballs are bigger than that.

**Your `.env` is never copied into the kit.** The clinic generates its own secrets at
install time, so no two sites share keys and yours do not travel.

**Do not commit a kit to git.** Both repos ignore `bethesda-offline-kit/` and `*.tar`
for that reason: the tarballs are gigabytes, and they contain third-party binaries
(Orthanc is GPLv3+, with AGPLv3+ plugins) that the repositories deliberately do not
publish. Bethesda's own code in the kit is GPL-3.0-only, like the repositories. Giving the stick to a clinic *is* distribution, so
[THIRD-PARTY-NOTICE.md](offline/THIRD-PARTY-NOTICE.md) rides along on it — leave it there.

## 1b. What you must put in `installers/` yourself (Windows)

This is the part that is easy to get wrong, because on a normal machine it happens
invisibly. **Docker Desktop does not bring WSL with it.** Its default (per-user)
installation supports the **WSL 2 backend only**, needs **WSL 2.1.5 or later**, and if WSL
is missing it runs `wsl --install`, which downloads roughly 250 MB from Microsoft. On a
machine with no internet that step simply fails, and Docker never starts.

So download all of this before you travel and copy it into `installers/`:

| File | Where from | Size |
|---|---|---|
| `Docker Desktop Installer.exe` | <https://www.docker.com/products/docker-desktop/> | ~600 MB |
| `wsl.<version>.x64.msi` | <https://github.com/microsoft/WSL/releases> (pick the latest `x64.msi`) | ~250 MB |

Then, on the clinic machine, **in this order**:

1. **Virtualization must be on in the BIOS/UEFI.** If it is off, WSL cannot start at all
   and nothing below will work. Check this first — it needs a reboot into firmware setup.
2. Turn on the two Windows features (these are already on the machine; no download):
   ```powershell
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   ```
3. **Reboot.**
4. Install `wsl.<version>.x64.msi` (double-click). Confirm with `wsl --version`.
5. Install Docker Desktop, open it once, wait for **"Engine running"**.
6. Now run `install-offline.ps1`.

Check the machine's Windows edition and build too: Docker Desktop requires Windows 10
22H2 (build 19045) or Windows 11 23H2 (build 22631) or newer. `winver` tells you.

On a **Linux** or NAS host none of this applies — install Docker Engine from the
distribution's packages (bring the `.deb`/`.rpm` files if there is no internet) and skip
straight to section 2.

## 2. At the clinic — install

Plug in the stick. If Docker is not installed yet, install it from `installers/`, open
Docker Desktop once, and wait for "Engine running".

**Windows** (PowerShell, in the kit folder)
```powershell
.\install-offline.ps1                  # installs to C:\Bethesda-EMR
.\install-offline.ps1 -InstallRoot D:\ # or another drive
.\install-offline.ps1 -NoPacs          # skip imaging
```

**Linux / NAS**
```bash
sh install-offline.sh /opt
```

The installer loads the images into Docker, copies the app **onto a local disk** (never
run it from the stick — the database and backups live next to the compose file, and
pulling the stick out would take them with it), generates fresh secrets, and starts the
stack without building anything.

When it finishes: **http://localhost:9080**, and you create the administrator account.

## 3. After installing

The kit only gets the software running. Everything in
[DEPLOYMENT.md](DEPLOYMENT.md) section 9 still applies — in particular:

- set `BACKUP_PATH` to a second drive and confirm a backup file appears,
- enable **Docker Desktop → Start when you sign in** so the server comes back after a
  power cut,
  (and never start Docker from a packaged app's shell - DEPLOYMENT.md section 3 says why),
- keep the ports on the LAN only,
- if you installed PACS, paste the bridge token into **Settings → Order Feed**.

## 4. Updating an offline site later

Re-run `pack.ps1` at home on the new version and bring the stick back (or any other way
the kit folder can reach the machine - a download, a shared folder). Then, from the new
kit folder, on the clinic machine:

```powershell
.\install-offline.ps1 -Update
```

Without `-Update`, running `install-offline` on a machine that already has an install
**keeps the existing folder and its `.env`** and changes nothing. With it, the script
first backs the database up into `C:\Bethesda-EMR\_pre-update-backups\`, then copies the
new source over the old (never `.env`, `backups\`, `_pre-update-backups\`, nor the PACS
`storage\`), loads the images and restarts; the migrations run on start. If the new
version looks wrong, restore that pre-update backup with DEPLOYMENT.md section 5b ("If
the backup is older than the app"). Staff PCs: press F5 once.

**A smaller kit for a slow link (1.7.1).** When only some images changed, pack just those:

```powershell
.\offline\pack.ps1 -Destination C:\kit -NoPacs -OnlyImages frontend
```

names the images to keep by a word in their name (`frontend`, `backend`, `bridge`…); the
source tree and the docs are complete as always, but the tarball holds only those images
(a frontend-only change is tens of MB instead of hundreds). The kit carries
`images\PARTIAL.txt` and `MANIFEST.txt` says "UPDATE ONLY"; `install-offline.ps1` refuses
it without `-Update`, and with `-Update` refuses it on a machine that has no EMR yet. The
other images stay as they are on the clinic machine. The CHANGELOG says which images a
version changed.

After such a kit, `/api/health` still reports the **backend image's** version (1.7.0 after
the 1.7.1 frontend-only kit) while the screen's top bar shows the new one: the backend
really is the older build, and that is fine. The number catches up with the next kit that
carries the backend image. Nothing else looks at that number at an offline site (the
update bell needs GitHub, and the backup-age check compares backend to backend).

Since 1.7.0. On an older kit the same by hand: copy the new source over the existing
folder yourself (keeping `.env`, `backups/` and `_pre-update-backups/`), then:

```powershell
docker load -i images\bethesda-emr-images.tar
cd C:\Bethesda-EMR
.\setup.ps1 -Offline
```

`update.bat` / `update.sh` are the **online** path: they fetch the new release from
GitHub. They will not work at a site with no internet.

## 4b. One click at the clinic — `Mise à jour Bethesda`

From 1.7.4 the server's desktop has a second shortcut, **Mise à jour Bethesda**
(`desktop-shortcut.ps1` makes it; it runs `offline\bethesda-update.ps1`, no administrator
rights). A double-click does what section 4 describes by hand:

1. Docker up? (It never starts Docker Desktop - DEPLOYMENT.md section 3 says why.)
2. Reads the running version (`/api/health`) and the newest kit: `latest.json` at the
   address in the script (a `update-source.json` next to `.env`, `{"latest_url": "..."}`,
   overrides it), or, without internet, `bethesda-offline-kit-v*.zip` + `.sha256` on a USB
   stick.
3. Same or older: "Déjà à jour". Newer: asks in French and Korean (about 30 s of downtime).
4. Downloads to `C:\Temp\bethesda-update\<version>\`, checks size and SHA256, unzips.
5. Backs the database up (`backup-cli`), runs the kit's `install-offline.ps1 -Update`
   (`-NoPacs` unless the kit has PACS and PACS is installed), waits for `/api/health` to say
   the new version. Result in a window; log in `<EMR>\logs\update-<date>.txt`.

**Publishing a kit**: `pack.ps1 ... -Zip` also writes `<kit>.zip`, `.zip.sha256` and
`latest.json` (whose `url` points at the release asset). Publish the three as one GitHub
Release tagged with the version (`-Repo owner/name` if you publish from a fork):

```powershell
gh release create vX.Y.Z <kit>.zip <kit>.zip.sha256 latest.json
```

The updater reads `https://github.com/BethesdaHaneulNa/Bethesda-EMR/releases/latest/download/latest.json`,
which GitHub redirects to the newest release's `latest.json`. A release asset is limited to
2 GB, so a full kit with every image usually travels on a USB stick; update kits with only
the changed images fit. To use another store, put its address in `update-source.json`.

The 🔔 update check in the top bar reads the same `latest.json` (`UPDATE_LATEST_URL`), and
Settings → Établissement shows what it sees, including "cannot check".

## 5. If something goes wrong

| Symptom | Cause |
|---|---|
| `docker: command not found` / "Docker is not running" | Docker not installed or not started. Install from `installers/`, open it once, wait for "Engine running". |
| Install stops with a missing-image error | The tarball did not load, or the kit was built from a different version. Check `MANIFEST.txt` and re-run `docker load`. |
| Compose tries to build anyway | You ran `setup` without the offline flag. Use `-Offline` / `--offline`. |
| "site can't be reached" but containers are `Up` | Windows reserved the port — see DEPLOYMENT.md section 6. |
| After a reboot Docker shows **no containers, no images, no volumes** | Docker was last started from a packaged app's shell and kept its data disk under `AppData\Local\Packages\...\LocalCache\Local\Docker\wsl\disk\`. Stop Docker, move that `docker_data.vhdx` to the real `%LOCALAPPDATA%\Docker\wsl\disk\`, start again — DEPLOYMENT.md section 3. |

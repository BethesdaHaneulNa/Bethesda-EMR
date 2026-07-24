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

**One manual step remains:** download the Docker Desktop installer and drop it in
`installers/`. The clinic machine cannot fetch it, and nothing else works without it.

Budget roughly 4–6 GB on the stick. Use exFAT or NTFS — FAT32 cannot hold a file over
4 GB and the image tarballs are bigger than that.

**Your `.env` is never copied into the kit.** The clinic generates its own secrets at
install time, so no two sites share keys and yours do not travel.

**Do not commit a kit to git.** Both repos ignore `bethesda-offline-kit/` and `*.tar`
for that reason: the tarballs are gigabytes, and they contain third-party binaries
(Orthanc is GPLv3+, with AGPLv3+ plugins) that the repositories deliberately do not
publish. Giving the stick to a clinic *is* distribution, so
[THIRD-PARTY-NOTICE.md](offline/THIRD-PARTY-NOTICE.md) rides along on it — leave it there.

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
- keep the ports on the LAN only,
- if you installed PACS, paste the bridge token into **Settings → Order Feed**.

## 4. Updating an offline site later

Re-run `pack.ps1` at home on the new version and bring the stick back. Running
`install-offline` again on a machine that already has an install will **keep the existing
folder and its `.env`** rather than overwrite it — so to actually apply an update, copy
the new source over the existing folder yourself (keeping `.env`, `backups/` and
`_pre-update-backups/`), then:

```powershell
docker load -i images\bethesda-emr-images.tar
cd C:\Bethesda-EMR
.\setup.ps1 -Offline
```

`update.bat` / `update.sh` are the **online** path: they fetch the new release from
GitHub. They will not work at a site with no internet.

## 5. If something goes wrong

| Symptom | Cause |
|---|---|
| `docker: command not found` / "Docker is not running" | Docker not installed or not started. Install from `installers/`, open it once, wait for "Engine running". |
| Install stops with a missing-image error | The tarball did not load, or the kit was built from a different version. Check `MANIFEST.txt` and re-run `docker load`. |
| Compose tries to build anyway | You ran `setup` without the offline flag. Use `-Offline` / `--offline`. |
| "site can't be reached" but containers are `Up` | Windows reserved the port — see DEPLOYMENT.md section 6. |

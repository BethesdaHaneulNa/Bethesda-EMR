# Deployment & Security Guide

This guide covers installing Bethesda EMR, keeping data safe, and securing it on a clinic
network. Bethesda EMR ships with **safe defaults** (random secrets, no default admin), but a
few things depend on *your* environment and are **your responsibility as the deployer** —
especially network access and HTTPS.

---

## 1. Requirements

- A machine that stays on: a small dedicated PC, a server, or a NAS that supports Docker.
- **Docker** (Docker Desktop on Windows/Mac, Docker Engine / Container Manager on Linux/NAS).
- For real use: a UPS is strongly recommended (power loss can corrupt databases).

## 2. Install (first run)

**Easiest (Windows, no commands):** download the repo ZIP (**`Code ▾` → Download ZIP**), unzip,
and double-click **`start.bat`**. It does everything below and opens the app in your browser.

**Command line (Linux / macOS / NAS, or if you prefer):**
```bash
./setup.sh      # Linux / macOS / NAS
.\setup.ps1     # Windows PowerShell
```

On first run, either way:
1. Generates a `.env` file with **strong random secrets** (database password, JWT secret).
2. Starts the stack with `docker compose up -d --build`.

> **No usable internet at the clinic?** That first run downloads well over a gigabyte and
> will not finish on a slow or intermittent link. Build the images before you travel and
> install from a USB stick instead — see **[OFFLINE-INSTALL.md](OFFLINE-INSTALL.md)**.

Then open **http://localhost:9080** (or `http://<host-ip>:9080` from another computer on the
network). You will be asked to **create the administrator account** — choose your own ID and
password. There is no `admin/admin`.

Add the rest of your staff in **Settings → Staff**, each with only the permissions they need.

## 3. Keep it running automatically (always-on server)

A clinic server should come back up by itself after a reboot or a power cut (important where
power is unreliable). Two things make that happen:

1. **Docker Desktop must start with the computer.** In Docker Desktop, go to
   **Settings (⚙) → General** and tick **"Start Docker Desktop when you sign in to your
   computer."** Then Docker launches automatically every time the PC starts.
2. **The app restarts itself.** The containers are configured with `restart: unless-stopped`, so
   once Docker is up they start again on their own. You don't need to run `start.bat` after every
   reboot — only the very first time.

So the normal cycle is: **power comes back → the PC boots → you sign in → Docker starts → the EMR
is up**, with no manual steps.

- **For a true unattended server** (comes back with *no one* present after a power cut), also turn
  on **Windows automatic sign-in** so it doesn't wait at the login screen. Only do this if the
  machine is in a locked/secure room, since anyone who can power it on is then signed in.
- **Use a UPS** (battery backup). It both rides out short outages and protects the database from
  corruption during sudden power loss.

## 4. Secrets (`.env`)

- The `.env` file holds your database password and JWT secret. It is **git-ignored** and must
  **never be committed or shared**.
- **Do not delete `.env`.** If you lose it, the app's secret won't match the database anymore.
- Re-running `setup` will **not** overwrite an existing `.env` (your secrets are kept).
- These secrets are generated per-install, so no two deployments share the same keys, and
  none of them are the public defaults from this repository.

## 5. Backups (on by default)

Backups are **on by default** — a daily `pg_dump` is saved to the **`backups`** folder next to
the app, keeping the last `BACKUP_RETENTION_DAYS` (30) days. In **Settings → Backup** you can
**back up now**, see the list, and **download** any backup to a USB / another drive.

**To save automatically to another drive** (recommended, so a single disk failure can't take the
data with it), set a path in `.env` and restart (`docker compose up -d` or `start.bat`):
```
BACKUP_PATH=D:\bethesda-backups        # Windows example
# BACKUP_PATH=/volume2/bethesda-backups  # NAS example
BACKUP_RETENTION_DAYS=30
BACKUP_TIME=02:00
```

> **3-2-1 rule:** another drive protects against disk failure, but not theft or fire. Keep an
> extra copy somewhere else too — use the **⬇ download** button to put one on a USB taken
> off-site, another machine, or cloud if you have internet.

To **restore** a backup: `gunzip -c backupfile.sql.gz | docker exec -i bethesda-emr-db psql -U medconnect -d medconnect`

## 6. Network & security — **your responsibility**

This is the part that depends entirely on *your* site. Bethesda EMR can't decide it for you.

### Keep it on the clinic LAN
- The app should be reachable **only from computers inside your clinic** (the local network).
- **Do not forward these ports on your router to the internet.** A machine behind a normal
  router (NAT) is already not reachable from the internet unless you deliberately forward ports
  — so usually this just means *don't set up port forwarding*.

### Ports
| Port | Service | Who needs to reach it |
|------|---------|-----------------------|
| 9080 | EMR (web) | clinic computers (browsers) |
| 9090 | PACS web/viewer (optional) | clinic computers + the EMR host |
| 4242 | PACS DICOM (optional) | imaging devices only |

Lock these down to your LAN with the host's firewall if you can. Don't expose them publicly.

### Windows: "the site can't be reached" even though Docker says everything is running
On Windows, Hyper-V/WSL reserves blocks of TCP ports for its own use, and the blocks it picks
change on every reboot. If your app's port lands inside one of those blocks, Docker cannot bind
it — the containers still come up and `docker ps` still shows them as `Up`, but nothing is
listening on the host, so the browser just times out. Nothing in the app looks broken, which
makes this very hard to diagnose remotely.

The EMR used to run on **8080** and the PACS on **8090**. Both sit inside a range Windows
frequently reserves (we hit `8013–8112` in practice), so they were moved to **9080** and
**9090**, which are outside the ranges Windows picks from.

To check the reserved ranges on a Windows host:
```
netsh interface ipv4 show excludedportrange protocol=tcp
```
If a port you need appears in that list, pick a different one in `docker-compose.yml` rather
than fighting Windows for it. On Linux hosts this problem does not exist.

### HTTPS (optional, recommended on Wi-Fi)
By default the app is served over plain HTTP. On a trusted **wired** LAN the risk is low. On
**Wi-Fi**, or if you ever allow remote access, you should put HTTPS in front so passwords and
patient data are encrypted in transit. Options:
- **NAS users:** most NAS (Synology/QNAP) have a built-in reverse proxy + certificate manager —
  point it at port 9080 and enable HTTPS from the NAS UI. Easiest path.
- **Reverse proxy:** put [Caddy](https://caddyserver.com) or nginx/Traefik in front. Caddy can
  issue a local self-signed certificate automatically (`tls internal`) for LAN use, or a real
  certificate via Let's Encrypt if you have a domain name and internet.
- **Self-signed certificate:** fine for internal use; browsers show a one-time warning you
  accept.

Choose based on your setup. If you need remote access from outside the clinic, use a **VPN**
into the clinic network rather than exposing the app directly.

## 7. Optional PACS (medical imaging)

The PACS companion (Orthanc) lives in a separate folder/stack. Run its own `setup` script,
which generates a random Orthanc password and a worklist **bridge token**. Paste that bridge
token into the EMR under **Settings → Order Feed → Bridge Token** so the two pair up. Orthanc
is **not** distributed by this project — it is pulled as an official Docker image.

## 8. Updates

When the app shows a "🔔 Update available" banner (admins only), update with one action —
whether you installed by **Download ZIP** or by `git clone`:

- **Windows:** double-click **`update.bat`**
- **Linux / macOS / NAS:** run **`./update.sh`**

The update script does everything safely, in order:
1. **Backs up** the database first (to `_pre-update-backups/`) — your data is never touched until a backup exists.
2. Gets the **latest released version** (via git if the folder is a git clone, otherwise by
   downloading the release — your `.env` and `backups/` are kept either way).
3. Rebuilds and restarts the containers.
4. Verifies the app is healthy.

Database migrations apply automatically on startup; existing data is preserved. The banner
clears once you're on the latest version. (Updating from inside the app's UI is intentionally
not offered — a container rebuilding itself is unsafe for a medical system, so the update runs
from the host instead.)

If something looks wrong after an update, your data is safe — restore the pre-update backup:
`gunzip -c _pre-update-backups/<file>.sql.gz | docker exec -i bethesda-emr-db psql -U medconnect -d medconnect`

## 9. Before you go live — checklist

- [ ] Ran `setup` so `.env` has unique random secrets (don't use the repo defaults).
- [ ] Created your real administrator account via the first-run wizard.
- [ ] Added real staff with least-privilege permissions; removed any test accounts.
- [ ] Set `BACKUP_PATH` to another drive, and verified a backup file appears.
- [ ] Have a second, off-site copy of backups.
- [ ] Ports are not forwarded to the internet; firewall limits them to the LAN.
- [ ] (If Wi-Fi / remote) HTTPS is set up.
- [ ] (If using PACS) Orthanc password changed and bridge token paired.
- [ ] Enabled **Docker Desktop → Settings → General → "Start Docker Desktop when you sign in"** so the server comes back up after a reboot/power cut (see section 3). Ideally a UPS too.

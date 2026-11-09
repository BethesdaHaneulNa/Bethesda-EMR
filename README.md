# Bethesda EMR

An electronic medical record (EMR) for a small clinic: reception, consultation, pharmacy,
laboratory, payment and statistics in one web application, with an optional PACS
companion for medical imaging. It runs on one server in the clinic with Docker, works
without internet (an offline install kit exists for sites with no usable connection), and
staff use it from any browser on the clinic's network. The interface is French first, with
English and Korean.

It was first built for a small mission clinic in Madagascar, which runs it every day. This
repository contains **no clinic data**: no patients, staff, drug or supply lists, prices or
site settings. A new install starts empty except for a few generic examples (departments,
example drugs and order codes) that you can edit or hide.

Copyright © 2026 Haneul Na and Bethesda EMR contributors. Free software under the
[GNU General Public License v3.0](LICENSE) (GPL-3.0-only).

---

## What it does

- **Registration** — patient records, chart numbers, visit/queue management
- **Consultation** — SOAP notes, diagnoses, prescriptions, exam/imaging orders, order sets,
  chart records (operation notes, consents, …), lab results, radiology readings
- **Pharmacy** — in-house / external dispensing
- **Payment** — billing, receipts, void/refund/correction, outstanding balances
- **Laboratory** — clinical pathology entry with reference ranges and auto-flagging
- **Statistics** — visits, revenue, outstanding, and drug-usage analytics (daily/monthly/yearly)
- **Settings** — staff & granular permissions, drugs, order codes, lab panels, departments,
  order sets, clinic letterhead, app title — all editable in the app
- **Trilingual** — switch between English / 한국어 / Français anywhere

An optional **PACS companion** (based on the open-source Orthanc) adds DICOM imaging:
modality worklist, image viewing inside the EMR, and radiology readings.

---

## Install

Only the server needs installing; staff open `http://<server address>:9080` in a browser.

1. Install [Docker](https://docs.docker.com/get-docker/) (Docker Desktop on Windows) and start it.
2. Download this repository (git clone, or **Code → Download ZIP** and unzip).
3. Run the setup once:

   ```sh
   ./setup.sh        # Linux / macOS / NAS
   .\setup.ps1       # Windows PowerShell (or double-click start.bat)
   ```

   On first run it writes a `.env` with random secrets (the database password and the
   session key - the repository has no defaults) and starts the stack at
   **http://localhost:9080**. Open it to create the administrator account; there is no
   default login.

**No internet at the clinic?** Build an offline kit on a connected machine
(`offline/pack.ps1`) and install it from a USB stick with `install-offline.ps1` - see
[OFFLINE-INSTALL.md](OFFLINE-INSTALL.md).

More in [DEPLOYMENT.md](DEPLOYMENT.md): backups (on by default), restoring, network
security, HTTPS, the PACS, and a go-live checklist.

## Update

- **Online:** `update.bat` (Windows) or `./update.sh`. It backs up the database, fetches
  the latest release, rebuilds and checks the app.
- **Offline kit:** `install-offline.ps1 -Update` from a newer kit keeps `.env`, backups and
  data, loads the new images and restarts. The **Mise à jour Bethesda** desktop shortcut
  does this in one click from the newest GitHub Release (`latest.json`) or from a kit on a
  USB stick.

Database migrations run by themselves on start; data is kept.

## Is it working? — the status window

Double-click **`server-status.bat`** on the machine that runs the clinic and leave the window
open. It re-checks every 15 seconds and shows one line per part of the system — patient records,
the application server, the EMR screen, disk space, last night's backup, imaging, and the device
worklist — in **Français / English / 한국어** (there is a button to switch).

It reads the machine directly rather than asking the EMR, so it keeps answering when the EMR
itself is the thing that broke — which is when you most need it. A green banner means everything
is working; red names what is not, in words a member of staff can repeat over the phone.

Several failures here are silent by nature: a backup that has not run for a month, a disk quietly
filling up, or an imaging worklist that stopped updating while every container still looks like it
is running. Those are the ones this window exists for.

For scripting, `powershell -File server-status.ps1 -Console` prints the same check once and exits
`0` when everything is fine, `1` if something needs attention, `2` if something is broken.

---

## Releasing a kit

`offline/pack.ps1 -Zip` builds the kit, its `.sha256` and `latest.json`; publish the three
as one GitHub Release (`gh release create vX.Y.Z <kit>.zip <kit>.zip.sha256 latest.json`).
A kit contains third-party images (Orthanc, PostgreSQL, Debian and Alpine packages), so
handing it on is distribution under their licences: keep
[offline/THIRD-PARTY-NOTICE.md](offline/THIRD-PARTY-NOTICE.md) in it, and **keep a copy of
the corresponding source of the Orthanc release that the kit ships** (the tag pinned in the
PACS `docker-compose.yml`) for at least three years, to honour the written offer in that
notice.

## Architecture

- **PostgreSQL 16** + **Express (Node 20)** API + **React** front-end (served by nginx)
- One exposed port: **9080**
- Database migrations apply automatically on startup (`backend/sql`)
- Optional PACS (Orthanc, unmodified official image) as a separate stack on port 9090

Contributions: see [CONTRIBUTING.md](CONTRIBUTING.md). Questions and bug reports: open an
issue.

## Licence

Bethesda EMR is free software: you can redistribute it and/or modify it under the terms of
the GNU General Public License as published by the Free Software Foundation, version 3.
It is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See
[LICENSE](LICENSE) for the full text and [NOTICE](NOTICE) for third-party software.

Whoever deploys it is responsible for configuring it safely (secrets, backups, network)
and for using it in line with local law on medical data.

This software was developed with the help of Claude (Anthropic's Claude Code).

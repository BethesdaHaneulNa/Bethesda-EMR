# Third-Party Software in the Offline Install Kit

The kit contains pre-built container images so it can be installed without internet.
Some of those images are third-party software under copyleft licences. Handing the
USB stick to a clinic is **distribution** in the legal sense, even though nothing is
sold and no money changes hands — so the licences travel with it, and this notice
goes on the stick.

This does not apply to the GitHub repositories: they contain only Bethesda source and
a *reference* to the upstream image names. No third-party binaries are published there.

**Bethesda EMR and Bethesda PACS themselves** (the `bethesda-*` images and the source
folders in this kit) are free software under the **GNU General Public License v3.0**
(GPL-3.0-only); the full text is `LICENSE` in each source folder, and third-party notices
for their npm packages are in the EMR's `NOTICE`.

---

## What is in the kit

| Image | Software | Licence |
|---|---|---|
| `orthancteam/orthanc:26.9.1` | Orthanc DICOM server, on **Debian** | **GPLv3+** (core) with some plugins under **AGPLv3+** — DICOMweb, Stone Web Viewer, Orthanc Explorer 2. The Debian base carries many GPL/LGPL packages (bash, coreutils, glibc, …) |
| `postgres:16-alpine` | PostgreSQL | PostgreSQL Licence (permissive), on Alpine Linux (musl MIT, BusyBox **GPLv2**) |
| `bethesda-emr-backend` | Bethesda EMR backend (**GPL-3.0-only**) on `node:20-alpine` | Node.js MIT; npm dependencies MIT/ISC/BSD/Apache-2.0 (list in `NOTICE`); Alpine (musl MIT, BusyBox **GPLv2**); `postgresql16-client` PostgreSQL Licence |
| `bethesda-emr-frontend` | Bethesda EMR web UI (**GPL-3.0-only**) on `nginx:alpine` | nginx BSD-2-Clause; React, React Router MIT (notices in `NOTICE`); Alpine as above |
| `bethesda-pacs-worklist-bridge` | Bethesda worklist bridge (**GPL-3.0-only**) on `python:3.12-slim`, **Debian**-based | Python PSF; `pydicom` MIT-style; `requests` Apache-2.0 with `certifi` **MPL-2.0**, `urllib3` MIT, `idna` BSD-3-Clause, `charset-normalizer` MIT; Debian packages (bash, coreutils, glibc, …) GPL/LGPL |

`pynetdicom` (MIT-style) is used only by the PACS repository's test scripts and is not in
any image.

Each image carries its own licence texts inside it, in the usual places
(`/usr/share/doc`, `/usr/share/licenses`).

## How Bethesda uses Orthanc

Bethesda EMR and the worklist bridge talk to Orthanc **only over its REST API and the
DICOM protocol**, and write worklist files into a folder it reads. Nothing links against
Orthanc's code and nothing derives from it — Orthanc runs as the unmodified upstream
image, pinned to a version.

The Orthanc project addresses this case explicitly in its
[licensing FAQ](https://orthanc.uclouvain.be/book/faq/licensing.html): *"Calling Orthanc
from a third-party system (using REST API or DICOM protocol), even if some AGPL-licensed
plugin is installed"* is permitted for every mode of distribution listed, including
proprietary ones. Bethesda's own licence is therefore unaffected by bundling Orthanc.

## Written offer for source code

For the GPL- and AGPL-licensed components in this kit, the complete corresponding source
code is published by their authors and is available here:

- **Orthanc** — <https://orthanc.uclouvain.be/downloads/> (source releases) and
  <https://github.com/orthanc-team/orthanc-builder> (the Docker image build)
- **BusyBox / Alpine** (node, nginx, postgres images) — <https://git.busybox.net/busybox/> and <https://gitlab.alpinelinux.org/alpine/aports>
- **Debian** (orthancteam/orthanc and python:3.12-slim images) — the source package of
  every installed package is at <https://sources.debian.org/> and, for the exact version,
  <https://snapshot.debian.org/> (`dpkg -l` inside the image lists name and version)
- **certifi** (MPL-2.0) — <https://github.com/certifi/python-certifi>
- **Bethesda EMR / PACS** — <https://github.com/BethesdaHaneulNa/Bethesda-EMR> and
  <https://github.com/BethesdaHaneulNa/Bethesda-PACS>

**Written offer.** For at least three years from the date you received this kit (and for
as long as the project offers spare parts or support for that kit version), the Bethesda
EMR project will give anyone who has it — on request, on a physical medium customarily
used for software interchange, for no more than the cost of physically performing that
distribution — the complete corresponding source code of every GPL-, LGPL- or
AGPL-licensed component in it. The project keeps its own copy of the Orthanc source for
each Orthanc tag a published kit ships, so that this offer does not depend on the links
above staying online. Ask through the GitHub repository above.

Versions are pinned in `docker-compose.yml` and recorded in `MANIFEST.txt`, so the exact
sources matching these binaries can always be identified.

## If you modify Orthanc

Nobody does today, and the kit ships it unmodified. But if a future version patches
Orthanc or writes an Orthanc plugin, the copyleft obligations change and the table in
the licensing FAQ above should be re-read first — in particular, deriving from an
**AGPL** plugin pulls the network-use clause in.

---

*Written in good faith by the project, not by a lawyer. If Bethesda is ever distributed
commercially or as a hosted service, get the licensing reviewed properly.*

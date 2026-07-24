# Third-Party Software in the Offline Install Kit

The kit contains pre-built container images so it can be installed without internet.
Some of those images are third-party software under copyleft licences. Handing the
USB stick to a clinic is **distribution** in the legal sense, even though nothing is
sold and no money changes hands — so the licences travel with it, and this notice
goes on the stick.

This does not apply to the GitHub repositories: they contain only Bethesda source and
a *reference* to the upstream image names. No third-party binaries are published there.

---

## What is in the kit

| Image | Software | Licence |
|---|---|---|
| `orthancteam/orthanc:26.6.1` | Orthanc DICOM server | **GPLv3+** (core) with some plugins under **AGPLv3+** — DICOMweb, Stone Web Viewer, Orthanc Explorer 2 |
| `postgres:16-alpine` | PostgreSQL | PostgreSQL Licence (permissive), on Alpine Linux (musl MIT, BusyBox **GPLv2**) |
| `bethesda-emr-backend` | Bethesda EMR backend on the Node.js image | Node.js MIT; npm dependencies under their own (mostly MIT/BSD/Apache-2.0) licences |
| `bethesda-emr-frontend` | Bethesda EMR web UI on nginx | nginx BSD-2-Clause |
| `bethesda-pacs-worklist-bridge` | Bethesda worklist bridge on the Python image | Python PSF; `pydicom` MIT, `requests` Apache-2.0 |

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
- **BusyBox / Alpine** — <https://git.busybox.net/busybox/> and <https://gitlab.alpinelinux.org/alpine/aports>
- **Bethesda EMR / PACS** — <https://github.com/BethesdaHaneulNa/Bethesda-EMR> and
  <https://github.com/BethesdaHaneulNa/Bethesda-PACS>

**In addition**, for three years from receiving this kit, the Bethesda EMR project will
supply — on request, on a physical medium, for no more than the cost of that medium —
the complete corresponding source code of any GPL- or AGPL-licensed component in it.
Ask through the GitHub repository above.

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

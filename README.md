# Bethesda EMR — a free EMR for small hospitals & clinics

**A free, self-hosted, multilingual Electronic Medical Record (EMR / EHR) system for small
hospitals and clinics** — especially those just beginning to move from paper to digital records.
It's lightweight, runs anywhere with **Docker**, and works in **English / 한국어 / Français**.

> **Free & non-profit.** Made freely available so hospitals in Madagascar, across Africa, and
> anywhere healthcare is becoming computerized can use it — free to use and modify (see
> [License](#license--please-read)). *Note: free and source-available, but not an OSI
> "open-source" license — redistribution is not permitted.*

---

## About this project / 프로젝트 소개

Bethesda EMR was sponsored by the church **행복한 섬김의 열매 ("Fruit of Joyful Devotion")**
and built for **Bethesda Hospital in Madagascar**.

The hospital had been running an older EMR made in Korea, but it was too heavy and tangled —
the translation/localization layer and many Korea-specific insurance modules were mixed in,
making it impractical for a mission hospital in Madagascar. So this project was started from
scratch: a clean, simple EMR that does what a clinic actually needs, in the languages the
staff actually use.

It is shared freely so that **other hospitals — particularly those just starting to
computerize — can use it for their own work.**

베데스다 EMR은 **'행복한 섬김의 열매'** 교회가 후원하여, 마다가스카르의 **베데스다 병원**을
위해 만든 비영리 전자의무기록(EMR)입니다. 기존에 쓰던 한국산 구형 EMR은 번역 환경과 보험 관련
프로그램들이 너무 섞여 무겁고 쓰기 어려웠기에, 클리닉에 꼭 필요한 기능만 담아 새로 만들었습니다.
이제 막 전산화를 시작하는 다른 병원들도 자유롭게 쓰시길 바라는 마음으로 공개합니다.

### Built with Claude

This software was developed through **"vibe coding" with Claude** (Anthropic's Claude /
Claude Code) — the application was designed and written in collaboration with the AI assistant.

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

## Quick start

**The people who use it every day (reception, doctors, pharmacy) install nothing** — they just
open the clinic server's address in a web browser. Only **one server** needs to be set up, once.

### The easy way — Windows, no commands

1. Install **[Docker Desktop](https://www.docker.com/products/docker-desktop)** (a normal
   installer — do this once) and start it.
2. On this page, click the green **`Code ▾`** button → **Download ZIP**, then unzip it
   (right-click → Extract All).
3. Double-click **`start.bat`**.

It downloads, builds, and starts everything, then opens the app in your browser, where you
**create your administrator account**. There is no default password. (The first run takes a few
minutes; if Windows shows a security prompt for `start.bat`, choose *More info → Run anyway*.)

### Command line — Linux / macOS / NAS (or if you prefer)

```bash
./setup.sh      # Linux / macOS / NAS
.\setup.ps1     # Windows PowerShell
```

Either way, setup generates strong random secrets on first run and starts everything at
**http://localhost:8080**.

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for backups, updates, network security, and the optional PACS.

---

## Architecture

- **PostgreSQL 16** + **Express (Node 20)** API + **React** front-end (served by nginx)
- One exposed port: **8080**
- Database migrations apply automatically on startup
- Optional PACS runs as a separate stack (Orthanc) on port 8090

---

## Questions & feature requests

Have a question, hit a problem, or want a feature added? Please open an **Issue** on this
repository — it's the best place, and the answer is visible to others who may wonder the same.

문의, 버그 신고, 추가했으면 하는 기능이 있으시면 이 저장소에 **Issue**를 남겨주세요.
(질문/답변이 공개돼서 다른 분들에게도 도움이 됩니다.)

---

## License — please read

This is a **non-profit, source-available** project, **not** a standard open-source release.

- ✅ You may **use** it freely, including in your own hospital or clinic.
- ✅ You may **modify** it freely for your own use.
- ❌ Please **do not redistribute** it (do not republish, repackage, sell, or hand it out
  as your own or under another name).

See **[LICENSE](LICENSE)** for the full terms. If you'd like to use it in a way the license
doesn't cover, please reach out first.

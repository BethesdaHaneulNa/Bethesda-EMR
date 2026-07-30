# Changelog

## v1.4.0 — 2026-07-30

### A doctor can finally be put in a department

The staff list has always had a Dept column and the API has always accepted
`department_id`, but there was no field for it in the staff form — so the column read
`—` for every single person and always would. `department.head_doctor_id` had the same
shape of gap: in the schema since the first migration, with its own foreign key, read
back by `GET /departments` as `head_name`, and the seed file even says heads are
assigned in Settings. There was nothing to assign them with.

Both now exist in the staff and department forms. The department form also gained the
French name, which the API had been accepting and returning all along: the clinic is in
Madagascar, the seeded departments already carry French names, and a department added
later would otherwise have shown Korean on a French screen.

A doctor's own department is deliberately separate from the department chosen per visit
at reception. One doctor can see patients for more than one service, so what the visit
was is a property of the visit, not of the person.

### Revenue by department and by doctor

Visit counts had been broken out by department and by doctor since the statistics screen
was built; money had not — the revenue query summed the whole clinic. `billing.visit_id`
is `NOT NULL`, so both breakdowns come from a join that was always available.

They are computed on different keys, and this is the point rather than an oversight.
Department revenue is grouped by the department chosen at reception, because that is what
the consultation actually was. Doctor revenue is grouped by the attending doctor, because
bonuses and performance are settled per person and grouping those by department would
scatter one doctor's work across several rows. The totals agree; the rows do not have to.

### The administrator account can no longer be locked out from the inside

Nothing stopped someone editing the admin account created during setup and unchecking
its settings permission, or moving it off the admin role, or deactivating it. Any of
those closes the last door from the inside: Settings is the only screen that can hand
the permission back, and no one can reach it any more. Short of editing the database by
hand there is no way back.

That account's login id, role, permissions and active status are now fixed in
`admin.routes.js` — not merely greyed out in the form, because the form is not the only
way to call the API. Its name, password, phone, email and department stay editable.

Renaming it would have side-stepped a check that only looked at the login id, so demoting
or deactivating *any* administrator is now refused when no other active administrator
holds the settings permission. With a second admin in place, every account stays fully
editable.

### Buttons now respond to being pressed

There are 140 buttons in this app and until now not one of them changed appearance when
clicked. A click that did not register looked exactly like a click that did — and the
natural response to an unsure click is to click again, which on a payment or a
prescription screen is how a duplicate entry gets made. This was the oldest thing wrong
with how the app feels, and it was never a styling preference.

The cause was structural. Everything is styled with React inline style objects, and an
inline style cannot express `:active`, `:hover`, or a media query. Five places had already
worked around it by mutating `e.currentTarget.style` by hand on `onMouseEnter`; there is
no equivalent trick for a press.

`index.html` gained a `medconnect-motion` style block holding the easing and duration
tokens and a `button:active` rule, which reaches all 140 buttons through the element
selector without touching a single component. Press feedback is `scale(0.97)` over 160ms
on `cubic-bezier(0.23, 1, 0.32, 1)`; hover brightness is gated behind
`@media (hover: hover) and (pointer: fine)` so that a tap on a touch screen does not
leave a hover stuck on.

Eight `div`-based controls that behave like buttons — the Settings tabs, the gender
selector, two toggles, the stat cards, the order-set header and tile, the chart-template
picker — got a `pressable` class so they feel identical.

**Thirty-four others deliberately did not.** Modal backdrops would scale the whole dimmed
screen. `stopPropagation` wrappers are not buttons at all. And the patient queue, drug
search results and visit lists are clicked continuously all day: at that frequency the
right amount of animation is less, not more.

`prefers-reduced-motion: reduce` is now honoured. Movement stops — the queue drawer
appears without sweeping 290px across the screen, buttons do not travel, bars do not grow
— while the brightness feedback that confirms a click landed stays. Reduced motion means
gentler, not none.

Two easings were corrected on the way past: the queue drawer was using the browser
default `ease` and now uses `cubic-bezier(0.32, 0.72, 0, 1)`, and the Stats bars dropped
from 300ms to 250ms on a real ease-out curve.

The bars still animate `width`/`height` rather than `transform`, which is the textbook
advice. Converting them would have distorted their corner radii at every intermediate
value and broken the `min-width: 3px` floor that keeps a department with a tiny share
visible at all. These bars animate once per data load, not continuously, so the trade was
not worth taking. `plans/003` records what a proper fix would require.

## v1.3.3 — 2026-07-30

**The same hole was still open on the writing side.** v1.3.2 closed it for restores
and left `pg_dump | gzip` untouched, but a pipeline reports the exit status of its
*last* command in both directions. A `pg_dump` that died half way through — database
briefly unreachable, disk full, a connection dropped at 02:00 — still exited 0,
because `gzip` had been perfectly happy to compress whatever reached it. `runBackup()`
read that 0, filed the truncated file as a good backup, and pruned older ones on the
strength of it.

Tested deliberately, the same way the restore hole was: `pg_dump` against a database
that does not exist, piped to `gzip`. Old behaviour — **exit code 0** and a 20-byte
file recorded as a successful nightly backup. With `set -o pipefail` and a `gzip -t`
on the result — **exit code 1**, and the file is deleted instead of kept. `runBackup()`
now also refuses a zero-byte result: a backup that exists but is empty is worse than
one that is missing, because it stops anyone from looking further.

`update.ps1` and `update.sh` took their safety backup through the same pipeline. In
`update.sh` the `set -e` at the top was already there to stop the update; it simply
never fired, because the failing pipeline reported success. In `update.ps1` there was
nothing to fire — `$ErrorActionPreference = 'Stop'` does not catch a native command's
exit code — so an empty safety backup was followed by the update regardless. Both now
verify the archive and stop before touching anything, and both check that the file
copied out to the host is non-empty.

### The running version is now visible

The top bar shows the build's own version beside the application title, injected from
`package.json` at build time. `/api/version` already knew it, but that endpoint is
gated on the settings permission, so most users could not see which build they were
on. What prompted this was someone looking at an update banner and asking why it was
there when the files on disk were already current. The answer was that the image had
not been rebuilt since v1.2.0 — the code was on disk, the container was not running
it. A version in the corner makes that visible without opening a terminal.

## v1.3.2 — 2026-07-24

**The restore command could quietly restore half a database.** Backups had never
been restored — only written — so this had gone unnoticed. The documented command
was `gunzip -c file.sql.gz | psql ...`, and it has two holes that only open on the
worst day. A shell pipeline reports the exit status of its *last* command, so if
`gunzip` dies on a truncated file its failure vanishes and `psql` succeeds on the
part it received. And `psql` without `ON_ERROR_STOP` carries on past errors and
still exits reporting success. Tested here deliberately: a backup cut off partway
through restores with **exit code 0**. On the day someone reaches for that command,
nobody is going to scroll back through the output looking for the errors.

Restoring is now three commands that are identical on Windows, Linux and a NAS, and
they run inside the database container: `docker cp` the file in, `gunzip -t` to
prove the archive is complete before anything touches the database, then restore
with `set -o pipefail`, `ON_ERROR_STOP=1` and `--single-transaction`. Either it
restores completely or the database is left exactly as it was. Running it inside the
container also stops the host's shell from re-encoding the SQL on the way through —
piping a dump through PowerShell mangles the accents in French and Malagasy names,
and reports success while doing it.

`DEPLOYMENT.md` gained a real restore section: stop the app first (the restore drops
every table, and the backend holds locks), restore, check the exit code, start again,
and what to tell the staff about the gap between the backup and now.

### Checking a backup before you need it

**`verify-backup.ps1` / `verify-backup.sh`** restore a backup into a temporary
database, compare it against the live one, and throw the temporary database away.
Nothing of yours is written to. It checks the archive, that it restores without a
single error, the schema, row counts per table, a checksum of every table's contents,
and that each sequence is ahead of the largest id in its own table — a restore that
loses that looks perfect until the first new patient collides with an existing record.

Verifying an **older** backup is treated differently from the newest one, deliberately.
An old backup *should* differ from today's database — that is the entire point of
keeping it — so it is checked for soundness on its own terms rather than being failed
for not matching. The tool would otherwise condemn exactly the backups you reach for
in an emergency.

An untested backup is not a backup. Run it once after setting up a clinic, and
occasionally after that.

## v1.3.1 — 2026-07-24

**The offline kit was missing a prerequisite that only fails when you are already
there.** It said to bring the Docker Desktop installer. That is not enough: Docker
Desktop's default installation runs on the WSL 2 backend and **does not bundle
WSL** — when WSL is absent it runs `wsl --install`, which downloads about 250 MB
from Microsoft. On the machine the kit exists for, that step simply fails, and
Docker never starts. Every other check would have passed right up to that point.

The kit now asks for **two** downloads, and spells out the order they go in:
BIOS virtualization, the two in-box Windows features via `dism`, a reboot, the
standalone WSL `.msi`, then Docker Desktop. `install-offline.ps1` also checks for
WSL when Docker will not answer, so the failure on site names the thing that is
actually missing instead of just reporting that Docker is not running.

Nothing in the application changed.

## v1.3.0 — 2026-07-24

**Installing no longer requires the internet.** The first run built the images on
the spot: Postgres, Node and nginx pulled from Docker Hub, every npm package
fetched, Orthanc on top of that if imaging was wanted. Well over a gigabyte, at a
site chosen for needing a clinic rather than for its bandwidth. On a slow link
that is a day; on an intermittent one it fails halfway and leaves a half-built
stack, which is a bad thing to be diagnosing in a room full of waiting patients.

There is now an **offline install kit**. Before travelling, `offline/pack.ps1`
(or `pack.sh`) builds everything where the connection is good, saves the images
to a tarball, and assembles a USB folder with a clean copy of the source. On
site, `install-offline.ps1` loads the images, copies the app to a local disk,
generates fresh secrets and starts the stack — with the network unplugged.

`setup` learned an `-Offline` / `--offline` flag that starts from the loaded
images and refuses to build. It fails loudly on a missing image rather than
quietly reaching for a registry that is not reachable.

Two things the kit is careful about. Your own `.env` is never copied into it, so
the secrets on your build machine do not travel and every clinic generates its
own. And the installer always copies the app off the stick onto a local disk —
running it from removable media works right up until someone unplugs it, and the
database volume and backups live next to the compose file.

Full instructions, including what to put on the stick by hand (the Docker
installer — that machine cannot download it either), are in
[OFFLINE-INSTALL.md](OFFLINE-INSTALL.md).

## v1.2.1 — 2026-07-24

**A backup missed at 02:00 was gone for good.** The scheduler asked "is it 02:00
right now?" every thirty seconds, so it only fired if the server happened to be
running during that exact minute. If the power was out at two in the morning —
or the machine was simply switched off — that night's backup never happened,
nothing retried it, and nobody was told. The gaps that leaves are invisible
until the day someone needs to restore.

It now asks whether a backup has happened since it was last due, and takes one
if not. A machine that comes back at eight in the morning backs up shortly
after it starts; one that was off for a week takes a single backup on return,
not seven. A failing backup is retried every 30 minutes rather than every 30
seconds, so a database that is down does not mean a `pg_dump` all night.

The catch-up file is named for when it actually ran (`..._0835`), not for the
slot it missed.

## v1.2.0 — 2026-07-23

**A way to see whether the system is working.** Until now nothing here answered
that question. Every part could fail quietly: the imaging worklist could stop
updating for hours, the nightly backup could have been failing for a month, the
disk could be filling up — and the first sign of any of it was a member of staff
saying something was wrong, if they connected it to a cause at all.

### The status window

Double-click **`server-status.bat`** on the machine that runs the clinic and
leave it open. One line per part of the system — patient records, application
server, EMR screen, disk space, last night's backup, imaging, device worklist —
re-checked every 15 seconds, in **Français / English / 한국어**.

It reads the machine directly instead of asking the EMR, so it keeps answering
when the EMR is the thing that broke, which is when you most need it. Green
means working; red names what is not, in words a member of staff can repeat over
the phone rather than a container name and a health status.

`powershell -File server-status.ps1 -Console` prints the same check once and
exits `0` fine / `1` needs attention / `2` broken, for scripting.

### Underneath

- `GET /api/system/status` — the same checks as JSON, for any logged-in member
  of staff. Whoever notices a problem is whoever happens to be at a screen, so
  this is deliberately not restricted to the settings permission.
- The imaging bridge now reports in after every cycle (`service_heartbeat`). It
  runs in a separate stack with no port of its own, so nothing could reach out
  and test it — silence is the signal.
- Every service gained a Docker healthcheck; only the database had one.

Update the PACS bridge alongside this — see
[Bethesda PACS](https://github.com/BethesdaHaneulNa/Bethesda-PACS/releases).

## v1.1.1 — 2026-07-23

**Every date sent to an imaging device was one day early.** Dates read out of
the database were formatted in UTC while the clinic runs three hours ahead, so
each one crossed back over midnight on the way out: a patient born on the 10th
reached the modality as the 9th, and an order placed today was scheduled for
yesterday — which a device that asks the worklist for *today* does not match at
all, leaving the technician with an empty screen and a patient in front of them.

Affects the modality worklist feed and the bridge feed (`/api/pacs/worklist-feed`,
`/api/worklist/mwl`). Nothing stored in the database was wrong, so the correct
dates appear as soon as you update — but images already captured carry the birth
date the device was given at the time.

Anyone using the PACS bridge should also update it; see the
[Bethesda PACS](https://github.com/BethesdaHaneulNa/Bethesda-PACS) repository.

## v1.1.0 — 2026-07-23

A full pass over every module (reception, consultation, pharmacy, lab, payment,
statistics, settings) turned up fourteen defects. Most share one shape: instead
of refusing bad input, the system quietly did the wrong thing and reported
success. Two of them let people see or be charged things they should not.

**Everyone should update.** Existing installs are unaffected in daily use — the
database migrates itself on start and no data is touched.

### Security

- **Statistics were readable by any logged-in account.** The routes had no
  permission check at all; only the sidebar tile was hidden. Anyone with any
  login — including reception — could pull clinic-wide revenue and the
  outstanding-balance list with patient names and phone numbers. The routes now
  check the `stats` permission.
- **Lab results were readable by reception.** Now restricted to the departments
  that need them.
- **The shared phrase list was editable by reception.** Creating, editing and
  deleting shared text now requires settings access.
- **A published JWT secret is no longer accepted.** The compose file and the auth
  middleware each carried a default secret; either is enough to sign a token the
  server trusts, so an install that came up without a `.env` could be handed a
  forged administrator token from outside — the login screen never enters into
  it. Both defaults are gone, and the stack now refuses to start without a real
  secret. `setup.sh` / `setup.ps1` have always generated one, so normal installs
  are unaffected.

### Money

- **An unrecognised visit type overcharged the patient.** The consultation fee is
  chosen by visit type, and the billing query fell back to the new-visit price
  for anything it did not recognise. Visit type and status are now validated.
- **Cash tendered was counted as revenue.** Reports summed `amount_paid` alone,
  so settling a 3 000 bill with a 10 000 note recorded 10 000 of income and put
  the patient on the list of people owed a 7 000 refund. A generated `net_paid`
  column now holds tendered minus change (migration `017`).
- **Carried-forward balances were billed twice.** When an old debt was added to a
  new bill, the old bill kept its own outstanding amount, so paying settled it in
  cash but not in the data and every later visit re-billed it. A bill now records
  which later bill absorbed it (migration `016`); voiding the later bill reverses
  it.
- **Dates rolled over at the wrong moment.** Columns defaulting to `CURRENT_DATE`
  ran on UTC, so visits and payments taken after local midnight were filed under
  the previous day. The database and backend now share the clinic's timezone —
  set `TZ` in `.env` (default `Indian/Antananarivo`).
- Negative unit prices and negative amounts were accepted throughout
  prescriptions and the fee list.

### Pharmacy

- **Outside prescriptions decremented in-house stock**, so the ledger drifted by
  every drug the patient bought elsewhere. (Payment already excluded them.)
- **Short stock was silently clamped to zero** and the shortfall vanished without
  a trace. The dispenser now sees a warning naming the amount short (한국어 /
  English / Français).

### Lab

- **Results could be attached to non-lab orders** such as consultation fees and
  imaging, which marked those orders complete and dropped them off their own
  department's worklist.
- **Saving with no values at all still marked the test finished**, leaving
  completed tests with no results.

### Reliability

- Invalid input returned `500` with the raw database error, exposing constraint
  and schema names. Bad values are `400`, duplicates are `409`.
- **Updating a record that does not exist answered `200` with an empty body** —
  a save that changed nothing looked like it worked. Affects drugs, fees, staff,
  departments and phrases; now `404`.
- Patient records could be saved with no name, and staff accounts created with no
  password. Both are now rejected.

### Updating

Double-click `update.bat` (Windows) or run `./update.sh`. The schema migrates
automatically on start.

---

## v1.0.1 — 2026-06-28

The payment screen no longer shows the "additional charge" banner on already-paid
visits when nothing new was added, and no longer creates a 0 Ar receipt for a
fully-settled visit.

## v1.0.0 — 2026-06-28

First release.

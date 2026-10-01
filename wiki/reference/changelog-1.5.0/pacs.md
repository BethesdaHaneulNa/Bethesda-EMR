## Imaging (PACS)

Two repositories change together here: the EMR (routes, screens, migrations 019, 028 and 035) and the
PACS folder (`Bethesda-PACS-main`: Orthanc settings, the worklist bridge and the install scripts). Update
both. Details and test records: `wiki/modules/pacs.md` section 8.

### Doctors see images without an image-server login

The image window used to load the Orthanc viewer directly from `http://<server>:9090`. Orthanc has a
single user, `admin`, so every doctor's browser asked for that administrator login — which can also
delete images — and every staff PC had to reach port 9090. The EMR now shows the viewer itself, under
its own address `/api/pacs/viewer/…`. Opening an image from an order gives the browser a short signed
cookie (30 minutes, that order's study only); the EMR checks the path, the study, and that the account is
still active with the consultation permission, then fetches from Orthanc with the stored login and
streams the answer back. Staff never see a password. Everything else Orthanc offers — the patient list,
its REST API, Orthanc Explorer — is refused through this path. When the EMR has no password yet, or the
wrong one after a restore, the window says so ("the administrator must run pair-with-emr.ps1") instead
of staying black.

Orthanc's web port now listens only on the server PC (`127.0.0.1:9090`); devices keep sending to port
4242 on the network as before. Stone's "Intended use" box is turned off: after closing it the image area
stayed black until the window was resized. Stone's own red line *Not for diagnostic usage* is still
shown. The **PACS web/viewer address** field in Settings → Order Feed is kept but marked unused, so an
older backup restores cleanly.

### Comparing with an earlier exam

Two chest films of different dates could not be put side by side: the image window was only allowed the
one study of the order it was opened from. It may now also load the same patient's other imaging studies
- only those the EMR linked to that patient's own orders, whose images carry the right patient number,
and whose order was not cancelled (nine at most). Above the images a button, **⇆ Comparer avec … du …**,
splits the screen in two with the opened exam on the left and the same exam from the time before on the
right; a click on any exam in the left-hand list replaces the right-hand image. The reading box still
belongs to the opened order. Another patient's images are refused exactly as before, and opening an exam
replaces what the previous image window was allowed to load.

### The EMR knows when the images have arrived, and whose they are

Nothing ever marked an imaging order done: a patient stayed on the device worklist all day after being
imaged, which made it easy to pick the wrong one for the next patient, and the order stayed "sent"
forever. The bridge now asks Orthanc, every cycle, whether each scheduled study has arrived and settled;
it tells the EMR, which marks the order **Réalisé** and drops it from the device worklist within a few
seconds. The readings list shows **N image(s) reçue(s)** or **Images en attente**.

When the images arrive the EMR compares the patient number written in the images with the chart number.
A mismatch shows a red warning in the readings list and the image window ("the images are in the name of
… — check the identity first"), a missing number a yellow one. This catches details typed or changed on
the device. It cannot catch a radiographer picking the wrong patient from the worklist, because the
images then carry that patient's own details — the staff guide says so.

Some devices ignore the study number they are given and make up their own, so their images were never
linked to the order. When the study number finds nothing, the bridge now looks for exactly one study
with the order's accession number; the EMR accepts it only if the accession matches, records the
device's real study number, opens the viewer on it, and marks the link ("linked by accession number —
check the identity").

### Imaging orders can be cancelled like lab orders

An imaging order that already had images or a reading could not be removed, and there was no other way
out. It can now be marked **Annulé**, with an optional reason, in the same way as a lab order with a
result. It leaves the bill and, if not imaged yet, the device worklist. Images and reading stay in the
record, still viewable, but no new reading can be saved. An imaging order that never went to the
worklist no longer opens the viewer's front page — the list of every patient in the PACS — inside one
patient's chart; it says that no images are linked. Reading dates are shown in the PC's local date:
a reading written between midnight and 03:00 used to appear on the previous day.

### Images and the EMR's backups go to an external disk every night

The EMR's nightly backup covered the database only, and it sat on the same disk as the EMR. The images
and Orthanc's index were on that disk too, with no copy anywhere: one failed disk would have taken
everything. New scripts in the PACS folder copy each night (02:30) the images that are new since the
last run, as plain DICOM files, to an external USB disk that carries a marker file; images are never
deleted from the disk. The same run copies the EMR's database backups (`backups\*.sql.gz`) to that disk,
each checked by hash and as a complete gzip, and keeps them by the EMR's own rule (30 days, never fewer
than the newest seven). The EMR's own backup folder and settings are not touched, so an unplugged disk
cannot affect the EMR. Each run reports counts and free space (no patient data) to the EMR, images and
database copies separately; the status screen warns when the disk is missing, full or the last success
is too old. A restore script puts the images back into Orthanc and checks that every EMR imaging order
with images has them again; `-Verify` checks the disk, the EMR copies included, without writing. The
disk is not encrypted and holds the whole EMR database: it must be kept locked away.

### Security: the worklist feed no longer answers to the published token

The bridge token that protects the order feed had a default, `change-me-bridge-token`, published in the
repository and accepted by the EMR. Any EMR that had never been paired with a PACS handed out today's
imaging patients — name, birth date, sex, chart number — to anyone who knew that string. The EMR now
treats a token that is empty, shorter than 16 characters or the old default as "not set" and refuses
every request; the bridge sends the token in a header instead of the URL; only the settings permission
can read the PACS settings, and the screen masks the token. The imaging APIs also check the screen
permission on the server (consultation for readings and the viewer, settings for configuration), not
just a login.

### Installing and pairing without copying secrets by hand

`setup` generates a random bridge token and Orthanc password on first run. **`pair-with-emr.ps1`** (and
`.sh`) pairs the PACS with an EMR on the same machine: it writes a new bridge token to both sides, and
the Orthanc password to the EMR, through standard input, then compares them by hash — the values never
appear on screen, on a command line or in a log. `setup` runs it by itself when the EMR is already up.
`check-windows-ports.ps1` warns when Windows has reserved ports 9090 or 4242, which made the running
PACS unreachable in September while its container still looked healthy.

### Smaller changes

- Opening an order whose images have not arrived shows one line saying so ("Les images de cette demande
  ne sont pas encore arrivées…") instead of an empty image window; the reading can still be written. If
  the EMR noted the arrival but the image server no longer has the images, the line says to tell the
  administrator (images to restore from the backup).
- The bridge reports in its heartbeat when it cannot ask Orthanc about arrivals; the status screen turns
  yellow instead of staying green.
- `PUT /api/worklist/:id/status` validates the status, returns 404 for an unknown entry and updates both
  tables in one transaction.
- Saving the order-feed settings keeps any field not sent, so a partial save can no longer blank the
  bridge token.
- Test scripts in the PACS folder no longer contain an old Orthanc password or real-looking patient
  details.
- Migrations: **019** image arrival columns on `worklist_log`; **028** `image_study_uid` (the device's own
  study number); **035** `pacs_config.orthanc_url` and `orthanc_password`. All only add columns.

### After updating

1. **Windows port range (server PC):** `netsh int ipv4 show dynamicport tcp` must show start 49152, 16384
   ports. If it starts near 1024, set it back (`netsh int ipv4 set dynamicport tcp start=49152
   num=16384`, same for ipv6), restart the PC, then run `check-windows-ports.ps1`.
2. **Recreate the PACS** from the updated folder (`start.bat`, or `docker compose up -d`), after the EMR
   has been updated.
3. **Run `pair-with-emr.ps1`** in the PACS folder. It must end with "The EMR can now show images without
   a login." Run it again after every restore of an EMR backup — the backup brings the old machine's
   token and password.
4. **Port 9090 is now for the server PC only.** Other PCs no longer need it: a firewall rule opened for
   9090 can be removed. Check that a doctor's PC opens an image with no login prompt, and that
   **Settings → Order Feed** shows "image server password set".
5. **Image backup:** plug in an external disk, run `prepare-backup-disk.ps1 -Target <drive>`, then
   `install-image-backup.ps1` once (add `-EmrPath <EMR folder>` if the EMR is not in a `Bethesda-EMR*`
   folder beside the PACS folder), then `image-backup.ps1` once by hand for the first full copy. Keep
   the disk locked away: it holds patient images and a full copy of the EMR database, unencrypted.
6. Devices: switch off "my AE title only" in the device's worklist query, or its worklist will be empty.

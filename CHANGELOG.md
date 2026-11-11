# Changelog

## v1.8.1 — 2026-11-11

One addition, asked for by the clinic's manager on site the morning after 1.8.0 was
installed, and released the same day at his request. No database change.

### Settings → Lab items: the price of a test, changed right there
The clinic's manager, 2026-11-11, after installing 1.8.0 on site ("the new Settings are very
good"): a new test is made in Lab items, but to change its price one had to go and find it
under Order codes. The chosen test now shows its **Price** above its items: type, **Save
price** (or Enter; the Save button under the items saves it too). It is the order code's own
price - one price, shown in two places - and the change is one line in the change log, as a
price changed in the order code form. Leaving with a price typed and not saved asks first.
- New route `PUT /api/admin/order-codes/:id/price` (settings permission; both prices move
  together; a code out of use or not there: 404; not a number, negative, too large: 400).
- Tests: `settings.ordercodes.mjs` (9 checks more), `settings.access.mjs` (158 routes).
- No database change.

## v1.8.0 — 2026-11-10

The clinic's manager, on his last evening on site: "build everything, run the bug hunt over
what you built too, and when all is done this is 1.8.0" - so it can be installed the next
morning. **This version changes the database** (065, folders): the updater backs the
database up first, as always. Everything below was run on an isolated stack; the whole
test set passes on the released tree.

### Settings → Lab items and Order sets: a list of everything, in folders inside folders
The clinic's manager, 2026-11-10: the two tabs were hard to use - the lab items behind one
"choose a panel" box (an empty screen until one is chosen, one panel at a time), the order
sets under a group typed as text, one level deep.
- **Both tabs**: on the left the whole list, filed in folders the clinic makes itself, a
  folder inside a folder (five levels at most), with a search box that ignores accents; on
  the right the editor that was there before. `+ Folder`, and on a selected folder
  `+ Sub-folder`, Rename, Move, ▲▼, Delete (an empty folder only), and `+ Test` /
  `+ Order set` to make one straight in that folder. A test or a set is filed elsewhere
  with Move on its line.
- **Consultation → Order sets** shows the same folders, with the search box.
- **"+ new lab panel" was broken since 1.7.17**: it sent the order group `Lab`, which
  stopped existing when the order groups became rows the clinic keeps (063) - the server
  answered "Unknown order-code group" and nothing was made. A new test now takes the group
  most lab tests carry (else Laboratory, else Other).
- Database: `065_item_folder.sql` - `item_folder`, `order_set.folder_id`,
  `order_code.lab_folder_id`. What exists is filed once at the top level: an order set
  under the group it carried, a lab test under its order group. Nothing else changes.
- API `/api/folders` (folder.routes.js); change log `settings.folder`. Tests:
  `settings.folders.mjs` (31 checks), `settings.access.mjs` (the six routes).

### Bug hunt, rounds 8 on
- Round 8 (settings): a text too long for its column (a department code of 11 letters, a
  staff name over 100 characters...) came back as the database's own English; it is now a
  400 the screen says in its language. Saving an order set that was removed meanwhile
  answered 200; it is a 404.
- Round 9 (statistics): every money figure agrees with the till's (cash of the day, by
  department = by doctor = total, balances); new test `stats.api.mjs` (16 checks). A date
  that does not exist (the 30th of February) passed the shared date check and was a 500.
- Round 10 (phone screens): a vital sign out of range was refused with its reason in
  English on a French screen ("valeur refusée (be between 25 and 45)"); the reason is in
  the screen's language now, on the phone and on the PC.
- Round 11 (updater, offline kit): read and syntax-checked only (running it would touch the
  machine's own EMR); nothing to fix. Round 12 (the PACS repository): one fix there, not
  released - the bridge cut nothing off an exam name longer than a DICOM value allows.
- 065 was made unable to fail on the clinic's data: group names that differ only by
  capitals or spaces become one folder, a name over 80 characters is cut, and it was run
  twice on deliberately awkward data before release.

### Settings → Personnel: an account that never served can be removed for good
- On a deactivated line an administrator sees **🗑 Effacer** (not on his own account, not on
  the setup administrator). `POST /admin/staff/:id/remove`: the server looks at every place
  that can hold a staff id - every foreign key to `staff` and the id columns without one -
  and refuses (409) when a single row points at the account; such an account stays,
  deactivated, so the records keep the person's name. An unused one is deleted, its login is
  free again, and the change log gets `settings.staff.delete` (who, which account).
- Asked after two trial accounts had to be removed from the site's database by hand.
- Test `backend/test/settings.staffremove.mjs` (12 checks); manual: settings.md.

## v1.7.21 — 2026-11-10

Bug hunt, rounds 3 to 7 (prescriptions and orders, payment, pharmacy and stock, laboratory,
imaging) and the staff-department rule. Released on the clinic manager's last day on site,
at his request ("publish what is done so far"). No database change. Rounds 8 to 12 are not
in it.

### Round 7 — imaging (the database side; no image server on the test stack)
- **A reading emptied kept its author and date**: the exam list said "read by Dr X on ..."
  over "no reading". An emptied reading now has neither (server and the viewer window).
- The imaging list's search ignores accents ("echographie" finds Échographie).
- A reading that is not a text, ids in the address that are not numbers (reading, readings,
  viewer-url, moves, worklist), a day that is not one (device feed, worklist): 400 instead
  of a 500 with the database's text.
- New test backend/test/imaging.api.mjs (16 checks): order to device feed, the bridge's
  arrival report and the patient check, the reading, the bridge token.
- Read only, not run (they need the image server): move, attach, import, export, viewer
  relay. Their input checks answered properly without one.

### Round 6 — laboratory
- **A result written as a range was judged by its first number**: "3-8" leucocytes per
  field against 0-5 was filed normal. A range ("3-8", "2 à 4", "2 a 4") is now judged by
  both ends and only where the answer is certain: 0-2 normal, 6-9 high, 3-8 no flag. Same
  code on the server (labFlag.js) and the screens (Lab.jsx, also used by the phone screen).
- **A result longer than 60 characters failed the whole save** with "value too long for
  type character varying(60)". The result box stops at 60 (PC and phone); the server says
  so in words and names the item; the long remark goes in the note.
- Settings, lab items: the item's own Min above its Max was accepted (every result then
  flagged); a name over 120 or a reference text over 60 characters was a 500. Checked on
  the screen and the server.
- Search ignores accents on the lab's lists and in the results window.
- Ids that are not numbers, free rows that do not fit, an unknown order code: 400 / 404.
- New test backend/test/lab.api.mjs (23 checks); lab.flag.mjs has the range cases and what
  they must answer (1087 cases).

### Round 5 — pharmacy and stock
- **A quantity too large in Entrée / Inventaire** (a barcode read into the box) reached the
  integer column and came back as "value ... is out of range for type integer". More than
  10 000 000 is now refused in the screen's language, by the screen and by the server
  (drugs and supplies); the count itself cannot pass 2 000 000 000.
- **Search boxes ignore accents** on the pharmacy's lists, the Stock and Supplies tabs and
  the payment list ("paracetamol" finds Paracétamol, "helene" Hélène) - as reception and
  consultation already did. The site's keyboards have no accent keys.
- A consultation the doctor has not finished cannot be dispensed by its number (it was
  never on the pharmacy's lists): 404, as for one with nothing waiting.
- Quantities sent as true or a list were read as 1 and 7; an id that is not a number in
  dispense / recent-rx / dispense-type was a 500. Both 400.
- Test: pharmacy.stock.mjs created its doctor without a department (refused since the
  staff-department rule) - fixed, and 8 checks added for the above.

### Round 4 — payment and receipts
- **A previous balance carried only in part charged the debt twice.** The screen always
  carries all that the patient owes, read when the visit was opened. If the balance was
  regrouped meanwhile (a settlement cancelled in the side panel, another till) and the
  figure sent was less than the oldest receipt owes, nothing was absorbed: the new receipt
  charged the amount and the old one went on owing all of it. Now refused (409
  BILL_CHANGED, the screen reloads), like a balance already settled.
- **A discount larger than the subtotal** showed a total of 0 Ar and then the server's
  refusal in English. The screen now says it in its own language before sending.
- Receipt lines are checked: a list, each line with a type, a name and amounts >= 0
  (-1 x -20000 = 20000 used to pass the sums). A figure with letters or beyond the columns,
  an id or a day in the address that is not one: 400 instead of a 500 with the database's
  text.
- Manual: reception said a "Sans frais" visit is never on the till's list; the day itself
  it is, at 0 Ar (payment 5 already said so).
- New test backend/test/billing.api.mjs (the payment routes had none): 37 checks over
  payment, refusals, part payment and carry, settlement, correction, supplement, re-bill.

Settings (asked from the site, 2026-11-10):
- **A staff account has a department only when it is a doctor.** In Personnel the Service box
  shows for the doctor role only and is required there; another role is saved without one,
  and a doctor changed to another role loses it. The server applies the same rule.

Round 3, prescriptions and orders:
- **A daily dose or a quantity typed with a comma is read** (`1,5` = 1.5). It was refused
  with “dose must be a number”; until the alert was read the row kept its old dose on the
  server. The text is trimmed, and forms only `Number()` understood (`1e2`) are refused.
- **`PUT` on a prescription or an order line leaves the fields it is not sent.** Both set
  every column from the body: `{frequency: 2}` emptied the dose, the days and the total;
  `{}` put an order back to 1 × 1 and its bill with it. The screen always sends the whole
  row, so nothing was lost there.
- **An order's kind is its order code's.** `code_type` came from the request alone, while
  the modality for the device list came from the table; a line without a code must be one
  of the five known kinds.

## v1.7.20 — 2026-11-10

Bug hunt, rounds 1 (reception) and 2 (consultation). Released now rather than at the end of
the loop because of the vital signs: a value typed with a comma was stored without its decimals.

Round 2, consultation:
- **Vital signs typed by the doctor lost their decimals.** The boxes went through
  `parseFloat` on the screen: `38,7` — the comma a French keyboard types — was saved as 38,
  `36,5` as 36, and text the screen could not read emptied the stored value without a word.
  The route also wrote any number it was given (99 °C, SpO2 150, a systolic of −5). The
  screen now sends what was typed and `PUT /consultations/:id` reads it as reception's and
  the phone's vital signs are read: the comma is a decimal point, `''` empties the field, an
  impossible value is refused with the field's name and the stored value stays.
- **A consultation is filed under the visit's patient.** `POST /consultations` took
  `patient_id` from the request; a wrong one put the consultation in another patient's
  history. It is now refused (400 `PATIENT_MISMATCH`).
- The same diagnosis twice is also caught when only spaces or accents differ.
- **Drug and exam search, the queue filter and the phrase search ignore accents**:
  “paracetamol” finds Paracétamol.
- New test file `backend/test/consult.api.mjs`.

Round 1, reception:
- **Patient search ignores accents.** “Helene” found nothing for Hélène (the same-name check
  already treated them as one name); the desk keyboards have no accent keys, so such a patient
  could only be found by chart number. The server search folds accents on the names, and
  reception's “Rechercher dans la file” does the same.
- A visit can no longer be registered to a **hidden department** or to a staff member who is
  **not an active doctor** (a screen left open from before the change still sent them; the
  transfer route already refused). On an edit only a change is judged, so a visit registered
  before its department was hidden still takes a new memo. New message for the doctor case.
- `POST /patients` takes '' for the sex or the birth date as “not known”, as `PUT` did.
- Reception's patient search drops an answer that arrives after a newer search was sent.
- Tests: `supply.api.mjs` registered a visit without a department (refused since 1.7.14, 15
  checks failed from there on) and `mobile.api.mjs` used an order-code group that no longer
  exists since 1.7.17 — both fixed; new checks in `reception.api.mjs`.

## v1.7.19 — 2026-11-10

**The doctors' waiting list has a date.** The consultation screen's list (☰ File d'Attente)
showed today only. It now has the same row as reception, payment and pharmacy — **◀ date ▶**
and **Aujourd’hui** — so a doctor picks a day and, with the doctor filter (⚙) on their own
name, sees the patients they saw that day. Choosing a past day moves the list to the
**Terminé** tab and the ☰ button shows the day; coming back to today returns to **En
attente**. A visit of a past day opens under the rules the chart already had for one.
`GET /api/visits/day` is readable with the consultation permission as well (it returns the
same rows `/visits/today` already gave, for another day). No database change.

## v1.7.18 — 2026-11-09

**Images that arrived without an order can be put under one.** When an exam is done without
picking the patient from the device's worklist, the images sit on the image server under
the device's own number and a typed name, and no order shows them. The imaging window now
has **📥 Images sans demande…**: the studies without an order (what the images say, the
device's clock, a thumbnail) on one side, the day's imaging orders without images on the
other; the person checks them side by side and attaches. The images are corrected on the
image server (the patient's chart number, name, birth date and sex, the order's accession
and study number), the order shows them, and the original is deleted only after the copy
has been checked image by image. Nothing is matched automatically. Written in the Journal;
an interrupted attach is finished or undone by the server (migration 064).

## v1.7.17 — 2026-11-09

**Departments can be hidden.** **Paramètres → Services**: Masquer / Afficher on each line. A
hidden department is no longer offered at reception; its visits, accounts and statistics
stay. At least one department stays active. Logged in the Journal.

**Order-code groups are the clinic's own list.** **Paramètres → Codes d'actes → 🗂 Groupes**
adds a group, renames it (the codes follow), orders, hides and removes it (only when no code
uses it); « Other » stays. The order-code window offers that list; a code saved with an
unknown group is refused. Migration 063 seeds the nine groups the screen knew plus any
name a code already carries.

**Updater: GitHub down is said as such.** When the update site does not answer although the
internet works, the message now says so and asks to try again in a few minutes, instead of
« no internet and no USB kit ». Takes effect from the update after this one.

## v1.7.16 — 2026-11-09

**Syrups, creams and inhalers are counted like any other drug.** The clinic's manager,
from the site: « the daily-total column is the count too: 2 · 1 · 1 means two go out ».
The separate « Quantité [ ] flacon » box under a pack-unit line is gone, on the
consultation screen and in the order-set editor: **Dose/j × Jours is the number of
bottles or tubes** dispensed, billed and taken from stock, and it must be a whole number
(a half bottle is refused when the line is saved). How to take it is written in the sig
or the memo. Under the line the sentence now gives the count only (« 2 flacons »).
Migration 062 converts the open lines written the old way (count · 1 · 1, the old
numbers moved into the memo or the sig); finished consultations keep their count.
Pharmacy, payment and the papers read the same total as before.

## v1.7.15 — 2026-11-09

**Reception: no standing red line.** The rule of 1.7.14 stays - no department, no
registration, on screen and on the server - but the reminder under « Service / Médecin »
is gone; the grey button says why on hover. The one message left is for a doctor who has
no department in Paramètres → Personnel, shown only when that doctor is chosen.

## v1.7.14 — 2026-11-09

**A visit is always registered to a department.** Asked on site: receipts were leaving
with an empty « Service » line. Reception now keeps the register button grey, with a red
reminder, until **Service / Médecin** is chosen, and the edit form cannot set it back to
« — ». The server refuses the same (400 `DEPARTMENT_REQUIRED` on POST and PUT /api/visits),
so no other screen can get round it. The doctor stays optional for the API; on the
reception screen choosing the doctor is what sets the department. Payment, which sets the
visit type alone, is untouched.

## v1.7.13 — 2026-11-09

**Drug categories are the clinic's own list.** Asked on site: an « Anesthésie » class was
missing, and the list was seventeen fixed words in the screen. Now **Paramètres →
Médicaments → 🗂 Catégories** adds a category (name in French, optionally Korean and
English), renames it, puts it in order, hides one the clinic no longer offers (a drug that
still carries it keeps it) and removes one no drug uses; « Autre » stays. The same list
names the classes in the drug window and table, the new category filter there, the
pharmacy's stock filter and the statistics export. Every change is in the Journal
(« Catégorie de médicaments modifiée »). Migration 060 keeps the seventeen keys as they
are stored on the drugs and adds **Anesthetic / Anesthésie / 마취제**; a drug saved with an
unknown category is refused.

**Receipts on half an A4 sheet.** **Paramètres → Établissement → Papier des reçus**: A4 (as
before) or A5 (148 × 210 mm, portrait). The receipt, the itemised statement and the summary
receipt follow it - narrower body, 9 mm margins, slightly smaller type - every other document
stays A4. Set the printer's default paper to A5 as well (migration 061).

**Order codes: the Supply group.** The group list of the order-code window lacked
« Supply », so a consumable made on screen landed in « Other » (BETH-DISPO-154 on site).
Supply is in the list, and choosing the type Consommable picks it.

## v1.7.12 — 2026-11-09

**Updater: the question can no longer hide behind the EMR.** On site the 1.7.10 updater
seemed to do nothing: it was waiting on « Installer maintenant ? » behind the other windows
(a message box without an owner, shown by a process whose console is hidden, loses the
foreground). Every box is now owned by an invisible always-on-top window. A second
double-click no longer starts a second updater: it says one is already open and brings
that window forward (mutex `Global\BethesdaUpdate`). Takes effect from the update
*after* this one, as always with updater changes. Nothing else changes.

## v1.7.11 — 2026-11-09

**The phone does more than vital signs.** Asked on site: the phone is the tool wherever
there is no PC. `/m` now opens on four big buttons - 🩺 Signes vitaux, 🧪 Labo, 📷 Imagerie,
📋 Ordres - under the FR · KO · EN switch. Every list is today's only (cancelled visits left
out), with a big ↻ Actualiser button on top (and a re-read every 30 s); text is 18 px or
more and everything tapped is at least 48 px tall. Emoji only from the set Windows 10 and
older Android draw.
- **🩺 Signes vitaux** - the 1.7.8 flow, unchanged.
- **🧪 Labo** - today's visits with lab orders and how many are pending / done -> the
  visit's orders -> one order's result boxes, with this patient's reference range and unit
  beside each, abnormal values in red, a numeric keyboard where the range is numeric.
  Saving goes through the PC lab screen's own routes (`GET /api/lab/order/:id/items`,
  `POST /api/lab/order/:id/results`): same flag, same change log, same `result_by` /
  `result_at`, so the doctor sees the result exactly as when typed on the PC. Saving needs
  the PC lab permission (one constant, `LAB_ENTRY_PERMS`); other accounts see the lists
  read-only.
- **📋 Ordres** (read-only) - today's visits -> every order the doctor placed: name, type,
  status (cancelled ones struck through), memo.
- **📷 Imagerie** (read-only) - today's imaging orders of every visit, oldest first: exam,
  patient, device type and body part, memo, and where it stands - not sent / sent to the
  device / images received (n) / no worklist (a code the EMR does not send to the device) /
  cancelled; a tap shows the details.
New read-only routes beside the vitals list, token only (any active account):
`GET /api/visits/today/lab-list`, `/today/orders-list`, `/today/imaging-list`.

**A phone already signed in stays on /m.** Opening a PC screen's address directly (the
browser's suggestions, a restored tab) used to leave a phone on the PC screen; the route
guard now sends it to `/m` too. 「Version ordinateur」 (`?pc=1`, kept until sign-out) is the
way to the PC screens on a phone.

**A new drug's minimum stock starts at 0** (migration 059, and the Settings form): no
low-stock warning until the pharmacy sets a minimum for that item. Existing rows are not
changed.

## v1.7.10 — 2026-11-09

**Preparation for a public, open-source release (GPL-3.0).** Nothing changes in how the
clinic works, except the one setting at the end of this entry.

- **No clinic data in the repository.** Migration 034 keeps only its schema (the
  `dosage_form` and `import_check*` columns); migration 056 stays as a numbered no-op. The
  drug list, opening stock and supply list they used to load are site data, kept outside
  the project. A fresh install starts with no drugs beyond the generic examples and no
  supplies; 002 no longer seeds an address, phone or e-mail. An existing install is not
  touched: applied migrations never run again. The backend log now notes at each start that
  about 27 already-applied migrations (their comments were reworded, 034/056 lost their
  data) differ from when they were applied - expected, nothing to do.
- **No default secrets.** `DB_PASSWORD` has no fallback in the code or in
  `docker-compose.yml`: without it the stack refuses to start, as it already did without
  `JWT_SECRET`. `setup` generates both on first run, and adds a missing `DB_PASSWORD` to an
  existing `.env` (taken from the running database container). A new member of staff gets a
  random 6-digit temporary password, shown in the form, instead of a fixed one.
- **Updates come from GitHub Releases.** The one-click updater, the 🔔 update check and
  `pack.ps1 -Zip` use `releases/latest/download/latest.json` of the project's repository
  (`UPDATE_LATEST_URL` and `update-source.json` still override it). `pack.ps1 -Repo` sets
  the repository; it prints the `gh release create` line to publish a kit.
- **Phone page note is a setting.** Settings → Établissement → **Note sur l'écran
  téléphone** (migration 058, `clinic.mobile_hint`) is shown under the list on `/m` when
  set. The Wi-Fi name that was built into the page is gone - **type it there once after
  this update**, or the phone page shows no Wi-Fi hint.
- **Licence: GPL-3.0-only.** `LICENSE` is the GNU GPL v3 text; `NOTICE` lists the npm
  dependencies (locked in the new `package-lock.json` files, installed with `npm ci`) and
  carries the MIT notices of React and React Router; `offline/THIRD-PARTY-NOTICE.md`
  matches the shipped images (Orthanc 26.9.1, the Debian and Alpine bases, the bridge's
  Python packages) and states the three-year source offer. The unused `bcryptjs`
  dependency was removed.
- Internal notes, names and addresses were taken out of comments and documents;
  `CONTRIBUTING.md` explains how to run, test on an isolated stack and contribute.

## v1.7.9 — 2026-11-09

**Vital signs no longer make a consultation.** Found at the clinic within an hour of 1.7.8:
an administrator typed the vitals of a waiting visit, and the row 1.7.8 made for them looked
like a consultation - the patient's history showed `2026-11-09 Bethesda —`, an empty
consultation under a non-doctor's name, and the waiting visit could no longer be cancelled.
That row is now marked `consultation.vitals_only` (migration 057; the status CHECK stays as
it is). It is left out of the patient's history (reception's 「Consultations précédentes」,
the chart, the doctor's history pane), it is not a record - reception can cancel the visit
and the row is deleted with it, as can the "back to waiting" and "finish without
consultation" buttons. The doctor still opens the visit with the vitals filled in; the
doctor's first action - the start, any write, Terminé - makes it a real consultation (flag
cleared, the doctor as `doctor_id`), and from then on the old rules hold (cancel refused).
Migration 057 marks the rows 1.7.8 made: vitals only, nothing else written, on a visit
still waiting. The other lists that read consultations reach them through prescriptions,
orders, diagnoses or bills, which a vitals-only row never has.

**/m speaks the phone's language.** A small FR · KO · EN switch at the top of the list, the
same choice as the PC's (default French); the units and a ✓ legend are translated too.

## v1.7.8 — 2026-11-09

**Vital signs are typed where they are taken.** The clinic's manager, on site: the vital signs are
measured where there is no PC, and the doctor must find them already filled. Two ways in,
both writing the visit's own consultation row (the eight boxes, `vitals_by` / `vitals_at`):
- **Reception** - a 「🩺 Signes vitaux」 button on each waiting or in-consultation row of
  today's queue opens a small window: the eight values (TA systolique / diastolique,
  température, pouls, SpO2, fréquence respiratoire, poids, taille), Enter to the next box,
  Esc to close, "Saisi par … à …" underneath. A ✓ on the button once they are in.
- **A phone** - `/m`, a page of its own (no menu): today's waiting and in-consultation
  patients with chart number, arrival time and a green ✓, then the eight values in big boxes.
  A phone opening the EMR's address or signing in lands there by itself; 「Version
  ordinateur」 at the bottom goes back to the usual screens until sign-out. Added to the home
  screen (web app manifest, the EMR icon) it opens straight on `/m`. A note under the list
  says which Wi-Fi to use.

Typing them **does not start the consultation**: the visit stays waiting until the doctor
takes it. The doctor's start finds the same row instead of making a second one, and takes it
over from the reception account (`doctor_id`). **Any signed-in, active member of staff** may
type them, whatever their role or modules (clinic manager); `vitals_by` says who. Like any record
they stop the visit being cancelled until they are emptied again. API: `GET/PUT
/api/visits/:id/vitals` (today's, not cancelled visits; loose ranges, "36,5" accepted) and
`GET /api/visits/today/vitals-list`; the queues also carry `vitals_at`. The login page fits
a 360 px screen.

**Imaging button readable on Windows 10.** The 🩻 X-ray emoji (Emoji 14, 2021) is not in Windows 10's
emoji font, so the «Imagerie» buttons showed a box and sat a little lower than their neighbours; they
now use 📷 (seven places: consultation, payment, radiology readings).

## v1.7.7 — 2026-11-09

**The updater shows its progress.** One small window for the whole run - the step in
French and Korean, a bar with the percent and MB while downloading, a moving bar while
installing - and the console is hidden: a French Windows console font has no Korean glyphs
(the Korean lines showed as boxes) and a visible console invited someone to close it
mid-install. After a successful update the icon cache is refreshed (ie4uinit) so a changed
desktop icon appears at once. Asked for on site after the 1.7.6 update.

## v1.7.6 — 2026-11-09

**The update shortcut has its own icon.** `bethesda-update.ico` - the EMR house with a green
download badge - so "Mise à jour Bethesda" no longer looks like "Bethesda EMR" on the
desktop (clinic manager). An older kit without the file keeps the EMR icon. The updater also
keeps the installer's own output in `logs\install-*.txt` and removes downloads older than
the previous version (asked for after the first one-click update, 1.7.4 -> 1.7.5 in 54 s).

## v1.7.5 — 2026-11-08

**The updater travels in the kit.** `pack.ps1` left the whole `offline\` folder out of the
source copy, so 1.7.4 reached the clinic without `bethesda-update.ps1` and no "Mise à jour
Bethesda" shortcut appeared. The kit now carries that one file under
`Bethesda-EMR\offline\`. Nothing else changes - this is the version the clinic updates to
with the desktop icon for the first time.

## v1.7.4 — 2026-11-08

**The change log is for administrators only.** Settings → Journal is shown to, and
`GET /api/admin/audit` answers, accounts of role Administrator only; the Settings
permission alone no longer opens it (clinic manager).

**One click to update, at the clinic.** A second desktop shortcut, **Mise à jour
Bethesda** (`offline\bethesda-update.ps1`), reads `latest.json` from the project's kit
store (or a kit on a USB stick without internet), compares with `/api/health`, asks in
French and Korean, downloads, checks size and SHA256, backs up, runs `install-offline.ps1
-Update`, waits for the new version and says so. No administrator rights, never starts
Docker Desktop, log in `logs\update-*.txt`. `pack.ps1 -Zip` writes the zip, its `.sha256`
and `latest.json` (OFFLINE-INSTALL.md 4b).

**Update check reads the same `latest.json`.** The GitHub repository is private, so the 🔔
check got a 404 and showed nothing for weeks; it now reads `latest.json` first and treats a
404 as "cannot check". Settings → Établissement shows the check's state. The update steps
in the 🔔 window name the desktop icon.

## v1.7.3 — 2026-11-08

Three things asked for on site. This kit carries the backend too (the first since 1.7.0),
so `/api/health` catches up to the version number.

**Phone numbers the Malagasy way.** The phone box on the registration form shapes the
number as it is typed: digits only, 3-2-3-2 with dashes (034-12-345-67, 020-22-123-45),
+261 in front becomes the 0, nothing past ten digits; two numbers separated by "/" are
each shaped. Numbers already stored keep their writing until edited (clinic manager: new entries
only). The search finds a phone by its digits whatever the stored writing - dashes, spaces
or none - once the query has three digits or more.

**Reprint: one ticked receipt asks too.** Ticking one receipt and pressing 🖨 now opens
the same "what to print" choice (receipt / itemised statement / both) as several receipts
do, instead of jumping straight to the receipt window where the statement was only a tab.
The small 🖨 on a receipt row still opens the window directly.

**Desktop shortcut icon.** The shortcut points at the icon in the installation folder;
only an icon on removable media is copied, and to %ProgramData%, not AppData - a setup run
from a packaged app's shell had its AppData copy redirected and the desktop showed a blank
icon (DEPLOYMENT.md section 3 on the same redirect and Docker).

**Worklist feed.** `station_ae` is now in the rows (it was read but never sent), so an
order code bound to one device can reach the bridge as ScheduledStationAETitle.

## v1.7.2 — 2026-11-08

Asked for on site: dates are written day first in Madagascar.

**Birth date day / month / year.** The three boxes on the registration form now read
day, month, year (JJ / MM / AAAA), the cursor moving in that order; a pasted whole date
(03/05/1990, 19900503 or 1990-05-03) still lands in the right boxes. Everywhere a birth
date is shown - search results, the similar-patient table, the patient finder, the
consultation banner, and the patient box of every printed document - it reads
DD/MM/YYYY. The record keeps YYYY-MM-DD; the API, the database and the imaging devices
see no change. Other dates (visits, results, payments) are unchanged.

## v1.7.1 — 2026-11-07

Asked for from the clinic on the day 1.7.0 went in: the people who count the supplies
are the pharmacy's, so the counting belongs on their screen.

**Supplies counted in the pharmacy.** The **Pharmacie** screen has a **🩹 Consommables**
tab next to **📦 Stock** - the same list, minimum warnings, receive, shelf count,
discard and record as the Settings tab of 1.7.0, which is gone. Name, price, unit and
minimum still change in Settings → Codes d'actes. Nothing moves in the database. A
supply put on a consultation is an order line, never a prescription, so it does not
appear in the pharmacy's dispensing lists; the API test now checks that.

**Smaller update kits.** `offline\pack.ps1 -OnlyImages frontend` saves only the images
named (here the frontend, 1.7.1's only changed image) instead of all five, so an update
over a slow link is tens of MB instead of hundreds. Such a kit is marked
(`images\PARTIAL.txt`) and `install-offline.ps1` accepts it only with `-Update`.

## v1.7.0 — 2026-11-07

The first release made for the clinic after the server arrived there. One thing was
missing from the first days: the consumables the clinic sells and counts - gloves,
needles, syringes, infusion sets, sutures, drapes, dressings, antiseptics, tubes. They
are neither drugs nor procedures, so they get a type of their own.

### Supplies (consumables)

**A fifth order code type, `supply`.** A supply is found in the consultation screen's
order box like any order code (badge **CONSO**), billed like a procedure line
(quantity × days × unit price, its own category on the receipt), and never offered in
the payment screen's fee list. (055)

**Counted like a drug.** Every supply has a count, a counting unit (Unit, PACKS, ROLL…)
and a minimum; Settings → 📦 **Supplies** shows the count, receives goods, records a
shelf count or a discard, and keeps the record of every change - including the lines
the consultation screen used: a supply put on a consultation leaves the stock, one
taken off or cancelled comes back, a changed count moves the difference. The count
stops at zero and notes the shortfall, as the pharmacy's does. The record is written
in the same transaction as the change, under the same row lock, so the count always
equals its last row. (`/api/supply/stock…`, `supply_movement`)

**The clinic's supply list was loaded** with its prices and counts (056; since 1.7.10 that
data is no longer part of the repository).

Settings → Order codes filters by **Supply** and the form shows the two supply fields;
the statistics' order list filters by it too. Tested end to end by
`backend/test/supply.api.mjs` (34 checks).

### Offline kit

`install-offline.ps1 -Update` applies a newer kit on a machine that already has an
install: it keeps `.env`, `backups/` and `_pre-update-backups/`, copies the new source
over, loads the images and restarts. Before 1.7.0 this was a hand procedure
(OFFLINE-INSTALL.md section 4).

## v1.6.0 — 2026-10-06

The week after 1.5.0 was spent on what the first patients would meet on paper and on
the screen: a diagnosis line on the consultation, the certificate a patient takes away,
a receipt that reads as a summary with the detail on its own sheet, images that can be
copied to a disc or brought in from one, and a statistics screen that answers the
questions the clinic will actually ask. Every screen that lists a day's work now works
by the same work date, searches the same way and sits in the same frame.

Underneath, the working notes have left the
program; the French staff guide stays, under `docs/manual-fr`.

### Consultation

**Diagnoses.** A consultation carries diagnoses as a small table, like the prescription
lines. The clinic keeps its own list of frequent diagnoses (about 490 entries, with
abbreviations and a search that puts the common ones first); the list lives in Settings
→ Diagnoses and is not the whole ICD-10 on purpose. (050, 052, 054)

**Medical certificate.** A certificate can be issued as a document: numbered, logged,
printable in the screen's language, without a licence number on it. Printed result sheets
(laboratory, reading) are not issued documents - they leave a change-log line only.

**Consultation note and phrases.** A free note on the consultation (038). Phrases are
grouped in categories that Settings manages (039); the consultation picks from the list
instead of five fixed buttons. A consultation that is being edited is saved two seconds
after the typing stops, and when the screen is left.

**Transfer.** A visit that was registered to the wrong department or doctor is moved from
the consultation screen or at reception (`PUT /api/visits/:id/transfer`) - until it has a
receipt. One change-log line says from whom to whom and why.

**Queue filter** (042) and the memo typed at reception becoming the complaint (045).

### Laboratory

- Text results (Negative / Positive / Trace …) are picked from a list the administrator
  keeps per item (048); the unit list is kept the same way and refuses an empty body (044).
- The lab screen works by work date like reception and payment, with a search box over
  the list; the results window prints, filters by panel and searches, in the same frame as
  the imaging window.
- The payment permission may read a patient's lab results (a button on the payment
  toolbar).

### Pharmacy

- The pharmacy screen works by work date; its search behaves like the lab's; the stock
  list is 300 px like the others; the refresh button sits right after the two tabs.

### Payment

**The receipt is a summary by category** (consultation, drugs, tests, imaging, procedures,
documents); the items go on a separate statement. Several receipts of one patient can be
printed together, and the log reads that.

- Counter fees can be saved on a visit before the receipt is made (049).
- The order-code window can allow a fee's amount to be typed at the till; the Document
  Fee amount is typed that way (047). Turning this on or off is logged.
- Amounts show their thousands as they are typed; the struck-through list price is gone.
- The payment list search behaves like the lab's; the waiting list's notes were corrected.

### Imaging (PACS)

**Images taken under the wrong order are moved or exchanged from the EMR** (046). A
correction is applied again when a restore of the image server brings the old study back.
Moving a large study no longer reads as a failure (the window asks again while nginx
waits).

**Out of the clinic and into it.** The images of an exam can be printed on the clinic's
sheet. A patient's exams can be copied to a CD, a disc image or a folder with the clinic's
own small viewer on the disc - that is *Bethesda CD* in the PACS repository (its
changelog tells the rest). A disc or USB stick from another hospital is brought in by
chart number, without an order; the imaging window shows those exams under *outside
images*, and the outside mark stays visible on long exam names (051).

- The image store can live on another drive (PACS 1.2.0); the bridge's heartbeat says
  how much room is left there.
- Orthanc 1.13.0 (image `orthancteam/orthanc:26.9.1`) on the running PACS; the colour
  ultrasound brightness in the Stone viewer is left as it is.

### Statistics

The nine parts are in six groups with a side menu, like Settings; one period row per
group, only the group shown is loaded, and the group is remembered.

- Patient statistics and workload by department and by doctor.
- Diagnosis statistics and order statistics (an index for them, 053).

### Settings

- **Diagnoses** tab: the clinic's list of frequent diagnoses, seen in English and in the
  light and paper themes.
- The change-log tab is called 로그 in Korean; fees and document charges are easier to
  find; the log reads receipts printed together, image printing and export, study moves,
  the pinned patient note and the printed sheets, in the screen's language.
- Modality list shows codes only, with a column width that is kept (040); an order code
  can carry a default dose (041); the admin manual follows all of this.
- The access test covers every route added since 1.5.0.

### Design

- One common icon for the three programs (option C, EMR = house): SVG, PNG and .ico,
  redrawn for 16 px; favicon and the house mark on the login screen.
- Payment, pharmacy, lab, the consultation drawer and reception's work-date row share
  one layout. Tables on the A4 preview follow the paper's font size; the consultation
  screen and the certificate were reviewed. A paper theme per staff member (043).

### After updating

Migrations 038 to 054 run by themselves at start. Recreate the PACS from the PACS folder
(1.2.0) after the EMR is up; the bridge token and the viewer address are unchanged. The
offline kit of 1.5.0 carries the old Orthanc and must not be used - pack this release.

The working notes are no longer in this repository.

## v1.5.0 — 2026-09-30

This release is the clinic's own list of what stood between the EMR and a first day of
patients at Bethesda. Each module was gone through screen by screen with the people who
will use it in mind: nurses who do the front desk, the pharmacy and the laboratory between
them, visiting doctors who prescribe the Korean way (a daily total and a number of days), a
till that takes cash, laptops at 1366 × 768, and no developer on site.

Three things run through all of it.

**Nothing is worked out quietly.** Where the EMR used to fill a gap with a guess - a dose of
"1", a total it multiplied itself, a port it replaced - it now leaves the gap visible and
says so. An empty field stays empty, a prescription with no total is shown as one to check,
and a wrong value is refused with a sentence in the screen's language.

**What changes is written down.** Stock movements, corrected results, cancelled orders and
receipts, changed prices and staff accounts each leave a line saying who and when, in a log
that the database itself refuses to edit. Money is counted on the day it moves, and the
statistics screen and the till agree to the ariary.

**It was tried as a day, not as screens.** One patient was taken from the desk to the
doctor, the laboratory, the pharmacy and the till in French, with a partial payment, a late
settlement, a correction and a cancelled test; what did not hold was fixed and the day was
run again. The staff guide in French (`docs/manual-fr`) was written from those screens.

The screen can now be light as well as dark, chosen by each person, and the dark screen
was brought up to the same contrast line as the light one - measured, not judged by eye.

Migrations 019 to 037 are applied by the server when it starts. **Take a backup before
updating and another one after**: a backup from before the update cannot be restored onto
the updated EMR with the everyday commands (`DEPLOYMENT.md`, 5b).

### Registration

#### Cancelling a waiting patient works — and no longer cancels one the doctor has opened

The **Cancel Waiting / Remove** button sent the status `canceled`, with one *l*; the API and the
database only accept `cancelled`. Every press ended in an error, so a patient who left
without being seen could not be taken off the queue from the screen at all.

With the spelling fixed, a second problem would have followed: the registration queue
did not refresh by itself, so the button could be pressed on a patient the doctor had
opened minutes earlier, stranding a consultation, its orders and its bill under a
cancelled visit that every other screen ignores. The server now cancels only a visit
that is still waiting, and answers otherwise with a message that says why.

#### Editing a registration no longer undoes the doctor's work

Saving a change to a queued visit — a corrected complaint, a different doctor — sent
back the status the visit had when it was clicked. If the doctor had finished in the
meantime, the visit went back to *waiting*: it reappeared in the doctor's queue and
dropped off the payment list, so the patient could leave without paying. Reception now
sends only the fields its form edits, and the queue refreshes itself every 30 seconds
while the tab is visible, without touching what is being typed.

#### A patient is registered once, even when the button is pressed twice

Nothing stopped a double click, and if the patient was saved but the visit failed,
pressing again created a second patient. Charts cannot be merged afterwards. Saves now
lock the buttons, and a patient created a moment ago is reused on the retry.

Before a new chart is made, reception now looks for patients with the same name —
ignoring case, extra spaces, accents, and first and last name given the other way
round — and shows their chart number, birth date, phone and last visit. Staff choose
*this patient*, *new record anyway*, or cancel. Registering someone already in today's
queue asks first as well, including when another desk has just done it. Both only warn,
as the office manager decided: a namesake is a real person, and a patient can come back
the same day for something else.

#### First visit, follow-up or no fee is chosen at the desk

Every registration went in as a first visit, and the cashier corrected the fee type by
hand; until then the statistics counted everyone as new. Reception now has three
buttons — **New Visit**, **Follow-Up**, **No fee** (emergency and referral were dropped
by decision; old visits keep them). Follow-up means *the same care continued*, so the
screen pre-selects it only when the patient has been seen in the same department
before, and never overrides a button staff pressed. Once a visit is billed the buttons
lock; the fee type is then changed at payment, as before.

A waiting patient sent straight to done with **Complete →** — someone who came only for a
certificate — used to reach the cashier with a first-visit fee. Completing a visit that
never saw the doctor now makes it *no fee*.

#### A work date, so yesterday's leftovers can be found

The queue only ever showed today. A patient left waiting or in progress at closing time
vanished from every screen while still counting as active in the statistics. The top
left of the screen now has a work date — previous day, calendar, next day, back to
today — like the clinic's own system. A past day is for looking and tidying up only
(cancel, complete); new registrations and edits happen on today's date. "Today" comes
from the server, not the PC's clock, and a screen left open over midnight moves to the
new day by itself.

#### Chart numbers start again at 1 each year

The first new patient of 2027 is `27-00001`. Numbers used to come from one sequence
running across years with the year in front (`26-00350` → `27-00351`), and past 99,999
they were cut to five digits and collided. The next number is now the year's highest
plus one, taken under a lock in the same transaction as the new patient, so two desks
cannot get the same number, and it is right after a backup is restored on another PC
because nothing depends on a sequence value. Numbers already issued are unchanged; this
year carries on from the highest. Past 99,999 a sixth digit is added.

#### Smaller changes staff will notice

- The sex buttons start unpressed and a patient cannot be saved until one is chosen —
  with *Male* pre-selected, women registered in a hurry were saved as men, and sex goes
  onto documents and to the imaging devices.
- Messages are in the screen's language: missing name or sex, an incomplete or impossible
  birth date, the server being unreachable, a record that no longer exists. Confirmations
  are sentences ("Patient mis en attente — RAKOTO Jean (N° dossier 26-00001)") instead of
  a button label with a tick. The birth-date boxes read AAAA / MM / JJ in French, and
  typing the month first no longer moves it into the year box. A whole date pasted into
  them (19900503, 1990-05-03, or 03/05/1990 day first) is split into the three boxes;
  before, the year box kept "1990" and dropped the rest.
- Patient search finds a name typed first-name-first, and `%` or `_` in the box are
  searched as characters instead of matching everyone. A search that finds nobody now
  says so under the box ("Aucun patient trouvé pour « … »") — before, nothing happened
  and staff could not tell whether the search had run.
- In the find-patient window used by consultation, payment and the lab, a visit
  cancelled at reception is greyed out and labelled.

#### Under the hood

- **Birth dates no longer move a day earlier.** Dates left the API as a UTC timestamp,
  the screens cut it at the `T`, and in Antananarivo (UTC+3) that is the previous day;
  registration wrote the earlier day back on every save. Found here, fixed for the whole
  app in `config/database.js`.
- The patient and visit APIs check module permissions, not just a login: pharmacy and
  lab accounts can no longer edit a patient or move a visit; a payment-only account may
  change a visit's fee type and nothing else.
- Editing a patient's details is written to the change log (who, which fields, before and
  after). Saving without changing anything writes nothing.
- Saving a patient or a visit writes only the fields sent. The queue does not carry
  address or ID number, and saving from it used to blank them.
- Visit updates are validated like new visits; a gender outside M/F and a birth date that
  is not on the calendar are refused with a plain 400 instead of a database error.
- New endpoints: `GET /api/visits/day` (the work date's queue), `GET /api/patients/similar`
  (same-name check). `GET /api/visits/today` is unchanged for consultation.
- Migration `029_reception_chart_no_yearly.sql` replaces `generate_chart_no()`; it changes
  no data and leaves `chart_no_seq` in place, unused.
- `backend/test/reception.api.mjs` checks every patient and visit route for every role,
  the warnings, search and chart numbers; `backend/test/reception.chartno.sql` checks the
  year change and numbers past 99,999. Isolated stacks only.

Details: the project notes, section 8.

### Consultation

#### Prescription totals follow the way the clinic prescribes

The clinic writes a prescription as *daily total · times a day · days · sig* — `3 · 3 · 7 · TID`
is three tablets a day, one at a time, for a week: 21. The EMR multiplied all three
(3 × 3 × 7 = 63), so every line with more than one intake a day was dispensed, billed and
counted in the statistics three or four times over. The total is now worked out in one
place on the server, daily total × days; the times a day only split the day's amount for
the label. Under each drug the screen shows the same sentence the pharmacy prints —
« 1 cp × 3 fois/jour pendant 7 jours (total 21) » — so the doctor reads what will be
handed over. Lines saved before the change keep their total (they were already
dispensed and paid) and are marked *old calculation*; they are recomputed only if the
dose, times or days are actually changed, never by clicking through them.

#### An empty field is never quietly turned into "1"

A drug added from the search now starts empty: the clinic's manager decided a drug carries a
price, not a default dose, and the dose belongs to the prescription or to an order set.
While checking this we found the screen saved an empty daily total as `1` and empty times
or days as `1`, and the server did the same, so touching one box could turn a half-written
line into "1 a day for 1 day" that nobody wrote — and that total is stock and money.
Empty now stays empty. A line without a daily total or days has no total at all (not 0):
it carries a red mark, the heading counts it, **Terminé** asks once, the pharmacy stops on
it and the cashier's list flags it. Order sets can now hold the daily total, times, days
and sig of each drug line (and quantity, times, days of each order line); applying a set
copies them as written.

#### Vital signs were erased when there was no blood pressure

The screen loaded the saved vital signs only when a blood pressure was among them. A
temperature or pulse taken alone showed empty when the consultation was reopened, and the
next **Sauver** wrote the empty boxes back — the measurement was gone. Found by the new
change log on its first test. All saved vital signs now load.

#### Operation notes

Eleven operation notes — general, soft-tissue mass, hernia, appendectomy, breast,
haemorrhoids, anal fistula, wound suture, incision and drainage, caesarean, circumcision —
and the surgical consent, each fitting one A4 page. Ticking a box draws on the printed
figure (clock face, breast quadrants, hernia and appendix plates, a fistula cross-section
that shows every tract chosen). In French everything on the page is French, while the
stored values stay the same, so a note can be reprinted in any language. One-answer
groups (yes/no, side) untick the other answer; a size left blank is not printed; text
still holding a `[placeholder]` is flagged under the box and asked about before issuing.
Documents are signed with the name of the doctor who writes them — not the visit's
assigned doctor — and are dated with the clinic's date, not the UTC one.

#### Results are kept: an order that has one is cancelled, not deleted

Deleting a lab order took its results with it (the database cascaded), and an imaging
order could be deleted after the study and the reading, taking the accession and the
report too; there was not even a confirmation. Such an order can no longer be deleted.
The ✕ on it offers to mark it **cancelled** instead, with an optional reason: the result
stays on record, the order leaves the lab list and the bill, a paid one comes back at the
cashier as a refund, and an imaging study not yet taken is withdrawn from the device
worklist. A cancelled line stays grey and struck through. Removing any line now asks
first.

#### A dispensed prescription can no longer be changed

The pharmacy's stock is taken out when a drug is handed over. Editing or deleting the
line afterwards moved the bill but not the shelf, and the two disagreed for good. Such a
line is now locked (🔒, **Délivré**); the doctor tells the pharmacy and writes a new line.

#### Orders are billed quantity × days

The times and days of an exam or procedure line were shown and editable but never
billed: an injection course written as 1 · 1 · 5 was charged once. Orders now follow the
prescription rule — quantity × days — and a line billed more than once says so under its
name. Lab and imaging orders always start at 1 · 1 · 1. Existing orders keep what they
meant (migration 030 fills the new total with their quantity), so nothing already paid
changes.

#### Syrups, creams and inhalers are prescribed by the bottle

For a drug the pharmacy marks as sold by the bottle, tube or piece, the doctor writes the
number of bottles; the daily dose and days stay as instructions for the patient. The
count must be a whole number, and a missing count is marked like a missing dose.

#### The screen in French, and at 1366 × 768

Queue states, phrase categories and phrases, search badges, vital-sign names, statuses
and messages follow the screen language. At 1366 wide — the most common screen at the
clinic — the middle column slid 135 px sideways and cut off the vital signs and the note;
the phrase dictionary's header now wraps, and the vital signs keep two columns down to
1280. Times and days boxes no longer hide their number behind spin buttons.

#### Smaller changes on the screen

- A line whose price is 0 is marked **Sans prix** in the search and in the table.
- Drugs hidden from the list are no longer prescribed through an order set; the set shows
  them struck through and the doctor is told which were left out.
- The search shows an imported drug's dosage form (**Comprimé**, **Sirop** …).
- Lab and imaging progress (**En attente** → **Résultat reçu**, **Envoyé** → **Réalisé**)
  updates by itself while the patient is open.
- The image viewer warns when the images carry another patient's number or none, and
  says when they were linked only by accession number; a radiology reading's date is the
  local date. Saving a reading shows a short notice instead of a box to click away.
- An imaging order shows **Envoyé** as soon as it is added (it used to appear only after
  the patient was opened again). The body part is written small next to the name; the
  **Unité** box no longer shows it cut to four letters.

#### Not visible on the screen

- Writing prescriptions and orders needs the *consultation* permission on the server,
  not only in the menu; reading them is limited to the screens that show them.
- A visit cancelled at reception can no longer be reopened (it used to come back to
  *in progress*); a consultation for an earlier visit is dated with the visit's day.
- Saving the note writes only the fields sent: every save used to blank the S/O/A/P,
  weight and height columns the screen does not show.
- Missing names and an over-long sig are refused with a 400 that says which field, instead
  of a 500.
- Cancelling an order, deleting an order or a prescription, and editing a finished
  consultation (Terminé pressed, or a visit from another day) are written to the change
  log with the old and new values.
- The time a consultation is first finished is stored; the pharmacy lists patients in
  that order.
- A prescription or order row is also saved 2 seconds after the last keystroke while the
  consultation is open, and rows not yet saved are sent when the page is closed or
  reloaded: a power cut or an F5 loses at most what was typed in the last 2 seconds.
  A finished consultation is still saved only on leaving the row (one change-log line).
- Every document issued and every document voided is written to the change log (number
  and name, never the contents). Voiding a document twice keeps the first reason.

Migrations: **023** (who cancelled an order, when, why), **030** (order total),
**032** (consultation finished time). All add columns; 030 and 032 fill them for
existing rows without changing any existing value.

Details: the project notes, section 8.

### Laboratory

#### Results typed the French way are read correctly

The flag on a result was worked out with `parseFloat`, which stops at the first
character it does not expect. The staff at the clinic write French numbers, so a
creatinine of `1,5` was read as 1 and filed as normal, and a white count of `12 000`
as 12. Nothing looked wrong on screen: the value was stored as typed, only its
judgement was off. A single comma is now read as the decimal point and a space before
three digits as a thousands separator, on the screen and on the server alike. The value
itself is still stored exactly as it was typed.

#### Editing a panel in Settings no longer empties the results already entered

Saving a panel's items deleted them all and inserted them again, so every item got a
new id and every result already entered lost its link to it. Reopening a finished order
showed blank boxes, and saving it again — to correct one value, say — deleted the rest.
Fixing a typo in an item's name was enough to set this off. Items now keep their id and
are updated in place; results unlinked by the old behaviour are matched back by name;
and a result whose item was removed stays on the order as its own row instead of
disappearing on the next save.

Changing the *unit* of an item that already has results would show the old numbers under
the new unit, so Settings now asks before it saves such a change and says how to do it
safely: add a differently named row and remove the old one.

#### A test reaches the lab as soon as it is ordered

The lab's list used to show an order only once the doctor had closed the consultation,
but patients usually go to the lab in the middle of it and come back with the result.
An order now appears as soon as it is placed, marked *In consultation* while the
consultation is open. The list still shows today's visits only — an earlier test is
opened through patient search, which already allowed it — and it refreshes itself every
30 seconds. *Completed* now means results entered today, so yesterday's sample finished
this morning is found there. Visits cancelled at reception no longer appear.

Saving on *All* used to stop at the first test with nothing typed in, after the tests
before it were already completed. Only the tests with something entered are saved now;
the rest stay pending, and the screen says which is which.

#### Text results are flagged, and repeats and cancellations are shown for what they are

A result such as `Positive` against a reference of `Negative` got no flag at all; it now
shows red with `!`. Spellings of the same word (`Négatif`, `Neg`, `-`) count as normal.
`Trace` is flagged until the doctors decide otherwise. `<5` and `>500` are judged only
where the answer is certain.

In a patient's results table, a test repeated on the same day used to show only the
later value. Each now has its own column, `(1)` and `(2)`, with the time it was entered.
When the doctor cancels a wrong order that already had results, those results stay as a
record: greyed out and struck through, in a column marked `✕` at the end of that date,
never in the numbered ones. Hovering over any value shows the reference range it was
judged by — useful when a child has since moved to another age band.

#### Reference ranges by sex and by age

Every item had a single range, so the default Hb of 13–17 g/dL (an adult male range)
flagged most healthy women and children as low. An item can now carry rows by sex and
age band, entered in Settings; the server picks the row that fits the patient's sex and
age on the day of the test, and falls back to the item's own range when the birth date
or sex is unknown. Overlapping rows for the same sex are refused, so it is always clear
which row applied. The range and the row used are saved with each result, so editing
the ranges later never changes how an old result was judged.

**No values are entered by this update.** Reference ranges depend on the analyser and are
the doctors' decision. A table of the ranges used by Korean laboratories, with sources,
is in the project notes, and a one-page questionnaire for the
doctors in the project notes.

#### Less visible

- A result cannot be saved into an order the consultation room has cancelled; that
  would have set it back to completed and back onto the bill.
- The server no longer trusts the reference range sent by the screen: it reads the
  item's current range when saving.
- Changing or clearing a result that was already entered is written to the shared change
  log (Settings → Log). A first entry is not.
- `GET /api/lab/test-items` now needs the lab or settings permission, like every other
  lab route.
- The flag and reference-range rules live in `backend/src/utils/labFlag.js`;
  `node backend/test/lab.flag.mjs` checks that the screen's copies agree with it.
- The lab screen fits a 1366×768 laptop: it was sized as the window minus a fixed
  height that the bars above it exceed, so the save button and the results table's
  scrollbar sat below the window. Saving the last tests of a patient now shows what
  was saved for a few seconds instead of just closing the patient.
- While a value is typed, the ▲ ▼ ! of the results table appear beside the box as well,
  so high and low are not told apart by colour alone; screen readers read them as high,
  low or abnormal.
- In Settings → Lab Test Items the list now scrolls. With a few sex and age tables open,
  the Save button sat below a 1366×768 window, where it could not be reached.
- The French screen no longer shows Korean text where a translation was missing.
- Migration `024_lab_ref_ranges.sql` adds the `lab_ref_range` table and
  `lab_result.ref_label`. It only adds; nothing existing is changed.

Details: the project notes, section 8.

### Pharmacy

#### Every change to the stock is now written down, with who and why

The drug table held one number per drug, `stock_qty`, and every screen that touched it
overwrote it. Dispensing lowered it, the settings drug form rewrote it with whatever the
form had loaded — so a count typed in the morning could undo the day's dispensing — and
nothing said what had happened in between. When the shelf and the computer disagreed
there was no way to find out why, and no month-end figure anyone could stand behind.

Every movement now goes through one place on the server and is written to a stock record
in the same transaction as the count itself: receipts, dispensing (with the patient),
shelf counts, discards and a starting line per drug. The pharmacy screen has a new
**📦 Stock** tab to receive, count (type what is on the shelf; the difference is worked
out) and discard (a reason is required, and nobody can throw away more than the record
holds). A dispense that takes more than the record had is not stopped — the medicine is
already in the patient's hand — but the shortfall is written on its own and the screen
asks for a shelf count. Settings can no longer change stock at all; a new drug starts
at 0 and is received in the Stock tab.

A **monthly stock report** (start, received, dispensed, shortfall, count adjustments,
discarded, end, and a check that they add up) is built from that record, on screen and
as a CSV that opens in Excel with accents intact. Drugs hidden in Settings are listed
only in months they moved. Dates follow the clinic's clock.

#### The pharmacy reads the prescription's own total, and says when it cannot

Prescriptions are written the Korean way: the dose is the day's total, and the quantity
handed out and billed is the daily total times the days, worked out when the doctor
saves. The pharmacy screen used to work its own figures out from the line, which did not
always agree with what was billed. It now shows the stored total and nothing else, adds
the amount per intake next to the daily total (in halves; anything that does not split
into halves is flagged for the doctor), and prints the same instruction on the outside
prescription — « 1 cp × 3 fois/jour pendant 7 jours (total 21) ».

A line with no total, or a total of 0 (a blank daily dose used to be saved as 0 × days),
is shown in red as *no total*, listed in the dispense confirmation, and not taken from
stock, instead of going through as nothing. A line whose times a day were left empty
still has its total and is dispensed, but is marked *times a day missing* so the patient
is not sent home without instructions. Lines saved under the old formula keep their
figure and are labelled as such.

#### Bottles and tubes are counted as bottles and tubes

A syrup, an inhaler, eye drops or a cream is handed out by the bottle or tube, but the
only quantity the system knew was doses, so "5 mL three times a day for 7 days" came out
as 105 of something. A drug can now be marked as a pack-unit drug in Settings (bottle,
tube, inhaler, unit); the doctor writes how many are handed out, and that count is what
leaves the stock and what is billed. The mark is copied onto each prescription when it
is written, so changing the drug later does not change old prescriptions. The pharmacy
screen, the outside prescription and the Stock tab show « 2 flacons » rather than a bare
number. Because the stock number has no unit, switching an existing drug makes the same
number read in the new unit: Settings now says so before saving, and the monthly report
marks a month in which the drug was dispensed both ways.

#### The clinic's own drug list replaces the examples

The 25 drugs the system shipped with were examples. The 101 drugs of the old stock
program's list of 15 May 2026 are now in, with name, ingredient, form and category, and
their stock as that list counted it — written to the stock record as a starting line of
its own, not as a count adjustment. Prices are left at 0 to be filled in on site. The
examples are hidden, not deleted: old prescriptions keep pointing at them, and an order
set line that uses one is skipped with a notice.

63 of the imported drugs still have something to look at on site (a quantity that does
not match the old program's own note, the same name under two codes, a corrected form,
an uncertain pack unit…). They were not held back: they carry a ⚠, the Stock tab can
list just those, shows what to check in French, and records who marked each one checked.

#### A drug carries a price, not a dosing

The settings drug form used to hold a default dose, times a day, days and posology,
which were copied into every new prescription. The clinic decided that the dosing belongs
to the prescription and to the doctors' order sets: the drug form now holds code, names,
ingredient, category, form, price, minimum stock and pack unit. The old columns stay in
the database, unused. The form also gained the ingredient, English name and minimum-stock
fields the server had always accepted; the minimum is what turns a count red, in the
drug list and in the Stock tab alike, instead of a fixed "below 20".

#### Smaller fixes on the pharmacy screen

- **Internal / external can no longer be switched after dispensing.** Switching a line
  already taken from stock to external dropped it from the bill while the stock stayed
  lowered. The server now refuses it; the screen explains why.
- **Two people finishing the same patient at once** no longer takes the stock twice, and
  two dispenses of the same drugs in opposite order no longer deadlock. The second person
  is told, in the screen's language, that the patient was already served.
- **The medicine total ignores external lines**, so it matches what the cashier charges.
- **A patient who did not collect yesterday** can be found with *Find patient* and served
  from prescriptions of the last 7 days; older ones are shown but refused, with the
  instruction to see the doctor. The *Dispensed* tab lists what was handed out today,
  whatever day it was prescribed, one row per patient.
- **The queue keeps its order.** It used to follow the last save of the consultation, so
  a doctor correcting a note moved the patient down; it now follows the moment the
  consultation was first finished. It also refreshes itself every 30 seconds and warns
  when the patient on screen was served by someone else in the meantime.
- **The early-refill warning is a sentence** (« Même médicament prescrit il y a 3 j pour
  7 j — encore 4 j de traitement ») instead of codes, and the drug tab in Settings is in
  French, English and Korean.

#### Behind the screens

- Migrations: `021_pharmacy_stock_movement.sql` (stock record, with a starting line for
  every existing drug), `025_pharmacy_pack_unit.sql` (pack-unit columns on drugs and
  prescription lines), `034_pharmacy_import_mission_stock.sql` (the drug list import:
  new columns `dosage_form` and the "to check" list, 101 drugs, their starting lines,
  the 25 examples hidden). 034 is generated from the review table by
  the project notes and must not be edited.
- Pharmacy routes check permissions one by one: dispensing needs the pharmacy
  permission; stock entries also accept consultation and settings; the report also
  accepts statistics.
- Test scripts `backend/test/pharmacy.*.mjs` run only against an isolated stack and use
  their own `TST-` drugs.

### Payment

#### One receipt per payment, even when the button is pressed twice

Nothing stopped a double click on **Confirm Payment**, and two cashiers could bill the same
patient at the same moment: each got a receipt, and the day's takings were counted
twice. Every button that writes money now locks while its request runs, and the server
refuses a bill for a visit whose receipts changed since the screen was opened (the
screen reloads and says so). The same check stops a patient's earlier balance from
being added to two new receipts.

#### Corrections record the cash actually held, and hand back only the difference

When items were removed after payment, the screen voided the receipt and wrote a new
one with figures of its own: a bill that had never been paid came back as paid in full,
the refund was taken off the takings a second time, and discounts, certificate fees and
carried balances were dropped. The correction is now worked out by the server in one
step from the money really received, keeps discount, counter fees and carried balances,
and shows on the waiting list what it will do — **To refund N**, **Left unpaid N** or
**No money difference** — the same figures as the correction screen. Leaving a bill
unpaid now always leaves the whole total owed.

#### Cancelling a receipt asks whether the money went back

In Madagascar patients pay cash, so an overcharge is corrected and only the difference
is handed back; cancelling a whole receipt is rare. The cancel dialog now says so, asks
for a reason, and asks *did you give the money back?* The answer is recorded (and
printed on the cancelled receipt), and a re-bill starts from the cash still at the till
— all of it, even when several receipts of the visit were cancelled.

#### Money is counted on the day it moves

Every payment, balance settlement, correction refund and refund on cancelling writes
one row to a cash record that cannot be edited. A day's total is the till: correcting or
cancelling yesterday's receipt no longer takes yesterday's takings down to zero and
moves them to today. Statistics switch to this record in the statistics update; the
payment screen's "cash of the day" line follows the new light theme.

#### Balances paid later are dated the day they are paid

Settling an old balance raised the old receipt's amount, so the money showed on the day
of the first visit and never on the day it reached the till. **Collect unpaid** now
issues a new receipt dated today, one per visit when several are settled together.

#### A clear French receipt from the stored bill

Right after payment the receipt came out blank with a 0 Ar total, and reprints left out
discount, change and balance. There is now one A4 receipt, always in French, printed
from the stored bill: clinic details from Settings, items with quantities (**2 flacons**
for syrups and creams), discount, amount handed over, change, balance, and the receipt
it replaces or the one its balance moved to.

#### What is billed follows the doctor's orders exactly

- Drug quantities are the total the consultation saved; payment no longer keeps a
  formula of its own. A line with no total is flagged and cannot be billed by mistake
  as 0.
- Orders are billed as quantity × days (an injection once a day for 5 days = 5).
- Orders the doctor cancelled are not billed; if they were already paid, the visit
  comes back for a correction.
- Lines with no price are marked *No price* (*Sans prix*) and asked about once, not refused.
- The consultation fee is read in one place from Settings; a missing fee code counts
  as 0 with a warning instead of a hidden built-in price.

#### The waiting list shows only what needs doing

Receipts for certificate or CD fees no longer bring a patient back as a refund. A visit
that ended part-paid leaves the list (its balance is collected from **Receipts**). An
earlier day's visit that was never billed now appears with its date — reception can
close yesterday's leftovers with its work date. A visit cancelled at reception shows a
notice and cannot be billed. The visit type offers **New Visit**, **Follow-Up** and **No fee**.

#### Behind the scenes

The server checks that items, subtotal, discount and total add up, and that change,
balance and status follow from what was paid. A debt carried into a later receipt
cannot be collected or cancelled twice. The payment API needs the payment permission
(the balance shown at reception, registration too). Cancellations and corrections are
written to the change log. Screen texts left in English were translated.

Details: the project notes section 8.

### Imaging (PACS)

Two repositories change together here: the EMR (routes, screens, migrations 019, 028 and 035) and the
PACS folder (`Bethesda-PACS-main`: Orthanc settings, the worklist bridge and the install scripts). Update
both. Details and test records: the project notes section 8.

#### Doctors see images without an image-server login

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

#### The EMR knows when the images have arrived, and whose they are

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

#### Imaging orders can be cancelled like lab orders

An imaging order that already had images or a reading could not be removed, and there was no other way
out. It can now be marked **Annulé**, with an optional reason, in the same way as a lab order with a
result. It leaves the bill and, if not imaged yet, the device worklist. Images and reading stay in the
record, still viewable, but no new reading can be saved. An imaging order that never went to the
worklist no longer opens the viewer's front page — the list of every patient in the PACS — inside one
patient's chart; it says that no images are linked. Reading dates are shown in the PC's local date:
a reading written between midnight and 03:00 used to appear on the previous day.

#### Images and the EMR's backups go to an external disk every night

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

#### Security: the worklist feed no longer answers to the published token

The bridge token that protects the order feed had a default, `change-me-bridge-token`, published in the
repository and accepted by the EMR. Any EMR that had never been paired with a PACS handed out today's
imaging patients — name, birth date, sex, chart number — to anyone who knew that string. The EMR now
treats a token that is empty, shorter than 16 characters or the old default as "not set" and refuses
every request; the bridge sends the token in a header instead of the URL; only the settings permission
can read the PACS settings, and the screen masks the token. The imaging APIs also check the screen
permission on the server (consultation for readings and the viewer, settings for configuration), not
just a login.

#### Installing and pairing without copying secrets by hand

`setup` generates a random bridge token and Orthanc password on first run. **`pair-with-emr.ps1`** (and
`.sh`) pairs the PACS with an EMR on the same machine: it writes a new bridge token to both sides, and
the Orthanc password to the EMR, through standard input, then compares them by hash — the values never
appear on screen, on a command line or in a log. `setup` runs it by itself when the EMR is already up.
`check-windows-ports.ps1` warns when Windows has reserved ports 9090 or 4242, which made the running
PACS unreachable in September while its container still looked healthy.

#### Smaller changes

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

### Statistics

Every figure on the Statistics screen was checked against a hand calculation on test data, and against the payment and pharmacy screens it summarises. Several did not agree. The details, with the reasoning and the tests, are in the project notes (sections 3 and 8).

#### Takings are now the till: money in and out on the day it moved

The takings used to be the receipts issued that day. When a receipt was corrected or cancelled on a later day, the first day's figure dropped to zero and the whole amount reappeared on the day of the correction. So the statistics never matched the day's cash, and a day already closed kept changing. Take a receipt of 18 000 paid on Monday and corrected on Tuesday with 3 000 handed back: Monday showed 0 and Tuesday 15 000, while the till had +18 000 and −3 000.

The payment screen now records every movement of cash as it happens (migration 036). The statistics read that record. The **Cash** card shows what came into the till minus what was handed back, with **In** and **Out** beneath, and a new **Cash by period** table gives it by day, month or year, with its CSV. A past day no longer changes when a receipt is corrected or cancelled later, and a day with more handed back than taken shows negative. The monthly trend follows the till too. Days before this release show exactly what the statistics showed before (the receipts then in force).

Department and doctor revenue still follow the receipts, because they answer whose treatment the money paid for. Their titles now say "by receipt" and show their total, which can differ from the till on days with corrections. Billed amounts, the average per visit and the balances are unchanged. The billed amount now sits under the treatment receipt count.

#### Debts already paid no longer show as owed

When an old debt was added to a later receipt and paid there, the statistics still counted it against the old receipt. The patient stayed on the debtor list, with a phone number, for money they had already paid, and a partly paid carry-over was counted twice. The Unpaid and Refund due cards and both lists now use the same figures as the patient balance on the payment screen. The card total and the list total now agree. A patient who both owes money and is owed some now appears on both lists, as on the payment screen, instead of the two being netted.

The list's "Since" column now shows the date of the oldest treatment still unpaid. It used to show a day early, because dates were converted to UTC on the way out. After a partial payment or a carry-over it also showed the date of the receipt now holding the debt, rather than when the debt began.

#### Visit counts add up

Cancelled registrations were counted as visits in the total, the new/follow-up split, unique patients, the department and doctor charts and the monthly trend. They now count only in their own Cancelled card. A new **No fee / other** card holds visits with no consultation fee, and the emergency and referral types that older records still carry. Total visits now equals new + follow-up + no fee/other.

A visit with no department or no doctor used to disappear from the doctor charts. It now shows as an **Unassigned** row. Two staff with the same name are no longer merged into one row.

#### Department and doctor revenue add up to takings, and follow the treatment

Doctor revenue left out visits with no attending doctor, so its rows summed to less than the takings, whatever the v1.4.0 notes said. Both charts now include every receipt. When an old debt is carried onto a later visit's receipt, the money is credited to the department and doctor of the visit that created the debt. A partial payment settles the oldest debt first, as carry-over does. Before, the doctor who happened to collect it got the credit. Money still counts on the day it was paid.

Document fees were drawn twice under revenue by item: once inside procedures and again as documents. The four item bars now add up to the billed amount.

#### The average is per visit, and settlements are counted apart

The average used to be cash collected divided by receipts. Unpaid receipts, old debts collected and extra receipts on the same visit all moved it. It is now **Avg billed / visit**: the amount billed divided by the visits billed. The receipt count now covers treatment receipts only. Receipts issued when a patient pays an old debt appear beneath it as "+ N balance settlement(s)", and the money is still counted in the takings.

#### Cancelled receipts: staff cancellations only

The Voided card counted both receipts cancelled by staff and receipts replaced by a correction, which are not refunds. It now counts staff cancellations only. The cash handed back when a receipt is cancelled appears as money out in the till figures, on the day it was handed back.

#### Drug usage

- The table has its own period (two date fields). Before, it always showed a fixed 30 days, 12 months or 5 years.
- **Dispensed** now follows the same rules as the pharmacy's new monthly stock report: it counts by the day the drug was handed over, in-house drugs only, rounded up to whole units. The two screens now give the same figure for the same month. **All prescriptions** still counts what was prescribed, by visit date. A line under the table says which rules apply.
- Outside prescriptions no longer count as dispensed. The dispense button marks them dispensed, but only a paper prescription left the building.
- Prescriptions of a cancelled registration are no longer counted, unless the pharmacy had already handed the drug over.
- Pack-unit drugs (syrups, inhalers, creams handed out by the bottle or tube) show their unit next to the name. Their bottle lines stay apart from any older dose lines of the same drug.
- The cross-drug total and the "total used" figure are gone. They added tablets to bottles. Each drug keeps its own total, and the CSV has a unit column.

#### Smaller changes

- The monthly trend shows quiet months as zero instead of skipping them.
- On the French screen amounts use a space between thousands (39 300 Ar), as elsewhere in French; Korean and English keep the comma. A count and its unit are now separated (« 3 cas »). Department and doctor names in the charts are no longer cut short. CSV files keep plain numbers.
- The French and English screens no longer show Korean text: the Cancelled label, the "unassigned" text, and the unit after counts. Department names follow the screen language.
- The debtor list is loaded when it is opened, and the trend when the page opens, instead of on every change of dates.

### Settings

#### Order sets decide the dose, the times and the days

An order-set line showed the drug's defaults as read-only text ("3.000×3×7"), and the drug form was
where a dose was set. The clinic manager's point, looking at the screen: the dose belongs to the set, not to
the drug. With the drug defaults gone from the drug form, each order-set line now has its own **Dose/j ·
Fois · Jours · Posologie** fields — the same names and order as a prescription line in the consultation
screen, total = daily total × days — and a new drug line starts empty. A line without a daily total or
days is marked and the set cannot be saved: applied to a patient it would have gone in with no total.
Exam and procedure lines have quantity, times and days; pack-unit drugs (syrups, inhalers) keep a bottle
count next to the dosing instructions. Drug saves now change only the fields sent, so a form without
the old default fields cannot wipe them.

#### Everyone can change their own password; an admin can bring an account back

Staff had no way to change a password: the initial one stayed until an administrator typed another.
Clicking your own name in the top bar now opens **Changer mon mot de passe** (current password once,
new one twice; no minimum length, by decision). A deactivated account could not be reactivated at all;
an administrator now has **Réactiver**, which brings the account back with the same login, password and
permissions. Both are written to the change log, never the password itself. A nurse role exists
(registration, pharmacy and laboratory by default), and a new doctor account gets pharmacy along with
consultation. The first-run setup account is always `admin`, so the lock-out protection always
recognises it.

#### A change log nobody can edit — the Journal tab

There was no record of who changed a lab result, a finished consultation, a receipt or a patient's
details. The modules now write each such change to `audit_log`, and **Paramètres → Journal** shows it:
when, who, what, which patient, old value → new value, filtered by date, person, type or patient. The
table refuses UPDATE, DELETE and — found during a restore drill, where it emptied the whole log —
TRUNCATE (migration 026). Staff account changes are logged by Settings, and so are prices when they
change (old price → new price; the clinic manager's decision): a drug's, including the first price of an
imported drug, and an order code's (consultation fees, lab tests, imaging, procedures). Every document
issued or voided is listed too (number, document, language, reason for voiding - never its content).
The Journal opens without the issued ones, which are many, and says how many are folded away; one tick
shows them. Voided documents are always shown.

#### Backups you can trust, and that say when they cannot be restored

Two backups in the same minute wrote the same file, and the one that failed deleted the other's good
file. Pruning by age alone could remove every backup after a long power cut. The Backup tab said
"automatic backup on" in green whatever had happened. All three are fixed: one backup at a time, the
newest seven are always kept, and a coloured band says OK / too old / none / failed with the error.

A restore drill found that **a backup restores with the usual commands only onto the version that made
it**: after an update, restoring an older backup stops (safely — nothing changes). The Backup tab, the
status window and `verify-backup` now say when the newest backup is older than the app, the update
scripts take a backup of the updated database as their last step, and DEPLOYMENT.md 5b has the
commands for an older backup. `clean-test-data.ps1` removes the test patients once on the new PC after
the move, and refuses to run on a database that is not exactly the backup it was restored from.

#### What is wrong, seen from any screen

The status checks existed only in the server PC's window. Accounts with the settings permission now
have a small dot next to the clock — green, yellow, red, or grey when the server does not answer — and a
click lists each check in words. The server status window also learned to see ports Windows had
reserved (the PACS was "healthy" and unreachable on this PC), the image backup to an external disk,
imaging addresses still on the old ports 8080/8090, and the database's drive as well as the backups'.
Since the night image backup also copies the EMR's backups to the same external disk (the clinic manager's
decision), both the dot and the window have a line for that copy: disk missing, copy failed, or no
copy for 36 hours. The Backup tab says so instead of asking for another drive in `.env`.

#### Smaller

- A wrong password on the login screen now says so (a page reload used to erase the message); "account
  inactive" is said only after the right password.
- The Settings screen, its messages and the server's messages are in French.
- Saving a drug in Settings never changes its stock; stock moves only through the pharmacy's record.
- Settings checks its inputs: unknown permissions, spaces around login ids, empty names, whole numbers.
- The edit windows say what they edit ("New staff member", "Edit drug"...), the staff form has an
  e-mail field, and deactivated staff are listed below the active ones. On a 1366×768 laptop only the
  fields scroll; Save stays in view.
- Amounts in Settings and the Journal are written like the payment screen's: « 15 000 » in French,
  « 15,000 » in Korean and English, without « .00 ».
- An order set that holds drugs removed from the list says so ("⚠ 2 drug(s) no longer in the list",
  the lines struck through): the consultation screen leaves them out. The drug search in the order-set
  editor shows stock and price, so two drugs with the same name can be told apart.

Migrations: 020 (nurse role), 022 (change log — coordinator), 026 (change log refuses TRUNCATE).
Details: the project notes section 8.

### Design — a light screen

Until now the EMR had one look: dark. That suits a dim room, but the clinic's consulting rooms get the sun and many of its monitors are old laptops at 1366×768, where pale grey text on near-black is hard to read. The details, with the measurements and the tools, are in the project notes.

#### The screen can be light or dark, and each person chooses

Next to the language buttons in the top bar there is a new two-part switch: **🌙 Dark** and **☀ Light** (**Sombre** / **Clair** in French, **어둡게** / **밝게** in Korean). The chosen part is filled. Pressing the other changes every screen at once: registration, consultation, payment, pharmacy and stock, laboratory, statistics, settings, and the windows they open (patient search, chart, documents, imaging reports).

The choice belongs to the account, not to the PC. A nurse who chooses the light screen at the front desk finds it light at the pharmacy PC too, and the doctor who logs in after her on the same PC gets the screen the doctor chose. The login screen does not know who is coming, so it shows the screen that PC showed last.

Every account starts on the dark screen, so nothing changes for anyone until they press the switch.

#### What stays the same on both screens

- **Anything on paper.** Receipts, prescriptions, surgical records, referral letters and their previews are white sheets as before, and the letterhead preview in Settings too. Printing is untouched.
- **The patient band** on the consultation screen: the dark blue row with the patient's name, chart number and allergy. It is the one thing a doctor must find without looking, so it does not move or change colour.
- **The image viewer**, which stays black.
- **What the colours mean.** Blue is waiting or chosen, amber is in progress or a notice, green is done or received, red is cancelled, unpaid or a warning, violet is a correction. No colour stands alone: each has its word or sign beside it (▲ ▼ ⚠ ✓), as before.
- **The layout, the words and the behaviour.** Only colours changed. While the light screen was being built the dark one was kept, colour for colour, as v1.4.0 had it, and this was checked rather than assumed: the computed colour of every element on sixty states of the screens was compared before and after each step.

#### The light screen was measured, not judged by eye

On the light screen every text meets WCAG AA against the background it actually sits on (4.5:1, or 3:1 for large text), including grey hints, coloured status words and text on coloured buttons, and every input has a border of at least 3:1. Inputs are white boxes with a visible outline, and the example text inside an empty one follows the theme instead of the browser's own grey. Buttons that were a bright colour with near-black text (in-house / outside in the pharmacy, receive / count / discard in stock, the laboratory's panel buttons) become a deep colour with white text on the light screen, because the bright ones would not carry white or black text well on white.

Three things are below the line on purpose and listed in the project notes: disabled buttons, large emoji used as pictures, and the faded "generated automatically" hint in the chart number box.

#### The dark screen was brought up to the same line

Measuring the light screen meant measuring the dark one, and it fell short in places: the faintest grey text (labels, table headings, hints) was 3.3:1 against the 4.5 it needs, the text on the blue and green buttons 3.7 and 2.5, the outline of an input 1.4 against 3. On a dim monitor with the sun on it, that is text that is not read and a box that is not found. The clinic's manager decided to correct it (2026-09-30).

On the dark screen the grey text is now lighter, every input has a visible outline, the example text inside an empty input reads, and the coloured buttons are a deeper shade so that the white text on them stands out. Blue, red and violet used as text are a step lighter. Nothing moved and no colour changed its meaning: the hues are the same, only lighter or deeper. The laboratory's buttons (the panel buttons such as CBC, and Save · Finish) are now deep cyan with white text on the dark screen too, as the clinic's manager decided, so that on every screen a deep button with white text is the one to press; the cyan of the test names and of the selected patient's marker is unchanged.

Across sixty-four states of the screens the count of texts and outlines below the line went from 137 to 14, and the 14 are disabled controls, large emoji used as pictures, and four places that need a line changed in a screen file (listed in the project notes). The change is in the colour values only. It was checked the other way round from the rest of this work: every colour that differs before and after is one of the decided pairs, and nothing else differs.

#### The box you are typing in shows it

The screens had switched off the browser's focus outline on their inputs, so apart from the blinking caret nothing showed where typing would go. The input that has the keyboard now has a blue ring, on both screens, whether it was reached with Tab or by a click. Buttons show the ring only when reached with the keyboard, so pressing one with the mouse does not flash.

### After updating

**Registration**

- Tell the desk: the sex must now be chosen; the visit type buttons replace the fee
  correction at the till; the work date is where yesterday's leftovers are tidied up
  each morning.
- Accounts given a narrow set of permissions by hand: the registration screen and the
  patient APIs need **Registration** (*Enregistrement* on the French screen). Accounts
  created with the Front desk or Nurse role already have it.
- Chart numbers: nothing to do. This year continues from the highest number issued; the
  first patient of next year gets `YY-00001`.

**Consultation**

- **Enter drug prices before the first patient.** A line keeps the price it was
  prescribed at; a line written at price 0 stays at 0 after the price is set, unless the
  doctor removes it and adds it again.
- **Rebuild the order sets' drug lines.** After the drug import the example drugs are
  hidden, so the existing sets add only their exams until their drug lines are replaced
  in Settings — with the daily total, times and days, which are no longer taken from the
  drug.

**Laboratory**

- Reference ranges are unchanged until someone enters them. Once the doctors have filled
  in the questionnaire, enter the chosen values in Settings → Lab Test Items, following
  section 2 of the project notes (“entering confirmed reference ranges”).
- Results entered before this update keep the flag they were saved with. A result typed
  with a comma before the update may carry a wrong flag; opening it and saving it again
  recomputes it.

**Pharmacy**

- **Count the shelves.** Imported stock is the May list's count. On a chosen day, count
  each drug and enter it with **Inventaire** in Pharmacie → 📦 Stock; the numbers are
  reliable from then on.
- **Go through ⚠ Médicaments à vérifier** in the Stock tab and mark each one **Vérifié**
  once seen.
- **Enter prices** for the imported drugs in Settings → Drugs (they start at 0, and the
  cashier's screen flags a line without a price).
- **Doctors: build the order sets** with their doses, times and days — drugs no longer
  bring a default dosing, so a drug added one by one starts empty.
- If a drug is later switched to or from bottles/tubes, **recount it** right after saving.

**Payment**

- Migrations `027_payment_billing_visit_index.sql`, `031_payment_item_pack_label.sql`,
  `033_payment_cancel_refund.sql`, `036_payment_cash_movement.sql` run on start.
  `036` writes one *opening* row per existing receipt, so past days keep the figures
  they had. Check once: `SELECT kind, COUNT(*), SUM(amount) FROM cash_movement GROUP BY kind;`
  — the opening total equals the takings of all receipts in force.
- Make a backup after the update (the cash record is new data).
- Staff guide: the project notes — especially *Correction* (hand back only
  the difference) and the new question when cancelling a receipt.

**Imaging (PACS)**

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

**Statistics**

- Tell the office staff before they open Statistics. The takings card is now **Cash**, the till for the day. The Unpaid total may be lower, because debts already paid through carry-over are no longer counted. Total visits leave out cancelled registrations. The average card has a new name and a new meaning.
- Past days keep their figures after the update. From the update on, a day's **Cash** should match the cash counted at the till; if it does not, the record is the place to look (Statistics → Cash by period, or the payment screen's cash for the day).
- No statistics migration (the cash record is payment's migration 036). The figures depend on the database connection using the clinic's time zone, which this release fixes centrally. Check that `TZ` in `.env` is `Indian/Antananarivo`.

**Settings**

- **Take a backup and verify it**: Settings → Backup → **Sauvegarder**, then `.\verify-backup.ps1 -Strict`.
  The update scripts do the backup themselves now; after an update made by hand, do it yourself —
  until then every backup is from the older version.
- **Check the imaging settings** in Settings → **Flux d'ordres**: the EMR address on 9080 and the image
  server address on 9090 (a yellow line under a field, and in the status window, means an old port).
  The viewer is now relayed by the EMR and needs pairing: if the status says the viewer is not paired,
  run `pair-with-emr` in the PACS folder. The old viewer address field is no longer used.
- **Existing doctor accounts** keep their permissions: tick **Pharmacie** by hand if the doctor should
  have it.
- `clean-test-data.ps1` is for a **new PC right after restoring**, once. The PC the EMR was prepared on
  is protected by `KEEP-TEST-DATA.txt` — do not copy that file to the new PC.

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

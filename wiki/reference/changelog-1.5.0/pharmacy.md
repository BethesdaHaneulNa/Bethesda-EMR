## Pharmacy

### Every change to the stock is now written down, with who and why

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
only in months they moved. Dates follow the clinic's clock. Wiki: `modules/pharmacy.md`
3.8–3.10.

### The pharmacy reads the prescription's own total, and says when it cannot

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

### Bottles and tubes are counted as bottles and tubes

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

### The clinic's own drug list replaces the examples

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

### A drug carries a price, not a dosing

The settings drug form used to hold a default dose, times a day, days and posology,
which were copied into every new prescription. The clinic decided that the dosing belongs
to the prescription and to the doctors' order sets: the drug form now holds code, names,
ingredient, category, form, price, minimum stock and pack unit. The old columns stay in
the database, unused. The form also gained the ingredient, English name and minimum-stock
fields the server had always accepted; the minimum is what turns a count red, in the
drug list and in the Stock tab alike, instead of a fixed "below 20".

### Smaller fixes on the pharmacy screen

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
- **A work date, as on the reception and payment screens.** The pharmacy lists showed
  today and nothing else. The same control now sits at the top of the list: today by
  default, one day back or forward, or any earlier date. *Waiting* is that day's visits
  with something still to hand out; *Dispensed* is what was handed out that day. A
  dispense done while an earlier date is on screen is still stamped with the real time,
  in the stock record and in today's *Dispensed* list, and the screen says so. The 7-day
  limit stays: an older prescription can be looked at, and the button is greyed with the
  reason. "Today" is the server's date, not the PC's clock.
- **The queue keeps its order.** It used to follow the last save of the consultation, so
  a doctor correcting a note moved the patient down; it now follows the moment the
  consultation was first finished. It also refreshes itself every 30 seconds and warns
  when the patient on screen was served by someone else in the meantime.
- **The early-refill warning is a sentence** (« Même médicament prescrit il y a 3 j pour
  7 j — encore 4 j de traitement ») instead of codes, and the drug tab in Settings is in
  French, English and Korean.

### Behind the screens

- Migrations: `021_pharmacy_stock_movement.sql` (stock record, with a starting line for
  every existing drug), `025_pharmacy_pack_unit.sql` (pack-unit columns on drugs and
  prescription lines), `034_pharmacy_import_mission_stock.sql` (the drug list import:
  new columns `dosage_form` and the "to check" list, 101 drugs, their starting lines,
  the 25 examples hidden). 034 is generated from the review table by
  `wiki/reference/drug-import-sql.js` and must not be edited.
- Pharmacy routes check permissions one by one: dispensing needs the pharmacy
  permission; stock entries also accept consultation and settings; the report also
  accepts statistics.
- Test scripts `backend/test/pharmacy.*.mjs` run only against an isolated stack and use
  their own `TST-` drugs.

### After updating

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

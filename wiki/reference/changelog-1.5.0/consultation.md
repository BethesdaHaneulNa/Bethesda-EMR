## Consultation

### Prescription totals follow the way the clinic prescribes

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

### An empty field is never quietly turned into "1"

A drug added from the search now starts empty: the director decided a drug carries a
price, not a default dose, and the dose belongs to the prescription or to an order set.
While checking this we found the screen saved an empty daily total as `1` and empty times
or days as `1`, and the server did the same, so touching one box could turn a half-written
line into "1 a day for 1 day" that nobody wrote — and that total is stock and money.
Empty now stays empty. A line without a daily total or days has no total at all (not 0):
it carries a red mark, the heading counts it, **Terminé** asks once, the pharmacy stops on
it and the cashier's list flags it. Order sets can now hold the daily total, times, days
and sig of each drug line (and quantity, times, days of each order line); applying a set
copies them as written.

### Vital signs were erased when there was no blood pressure

The screen loaded the saved vital signs only when a blood pressure was among them. A
temperature or pulse taken alone showed empty when the consultation was reopened, and the
next **Sauver** wrote the empty boxes back — the measurement was gone. Found by the new
change log on its first test. All saved vital signs now load.

### Operation notes

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

### Results are kept: an order that has one is cancelled, not deleted

Deleting a lab order took its results with it (the database cascaded), and an imaging
order could be deleted after the study and the reading, taking the accession and the
report too; there was not even a confirmation. Such an order can no longer be deleted.
The ✕ on it offers to mark it **cancelled** instead, with an optional reason: the result
stays on record, the order leaves the lab list and the bill, a paid one comes back at the
cashier as a refund, and an imaging study not yet taken is withdrawn from the device
worklist. A cancelled line stays grey and struck through. Removing any line now asks
first.

### A dispensed prescription can no longer be changed

The pharmacy's stock is taken out when a drug is handed over. Editing or deleting the
line afterwards moved the bill but not the shelf, and the two disagreed for good. Such a
line is now locked (🔒, **Délivré**); the doctor tells the pharmacy and writes a new line.

### Orders are billed quantity × days

The times and days of an exam or procedure line were shown and editable but never
billed: an injection course written as 1 · 1 · 5 was charged once. Orders now follow the
prescription rule — quantity × days — and a line billed more than once says so under its
name. Lab and imaging orders always start at 1 · 1 · 1. Existing orders keep what they
meant (migration 030 fills the new total with their quantity), so nothing already paid
changes.

### Syrups, creams and inhalers are prescribed by the bottle

For a drug the pharmacy marks as sold by the bottle, tube or piece, the doctor writes the
number of bottles; the daily dose and days stay as instructions for the patient. The
count must be a whole number, and a missing count is marked like a missing dose.

### The screen in French, and at 1366 × 768

Queue states, phrase categories and phrases, search badges, vital-sign names, statuses
and messages follow the screen language. At 1366 wide — the most common screen at the
clinic — the middle column slid 135 px sideways and cut off the vital signs and the note;
the phrase dictionary's header now wraps, and the vital signs keep two columns down to
1280. Times and days boxes no longer hide their number behind spin buttons.

### Each doctor has their own note on a visit

The note of a visit was one text: a second doctor opening the same visit typed into it,
and nothing said who wrote what. Now each doctor has **one note per visit**, under their
name. The box in the middle is *Ma note de consultation*; after **Sauver** it stays in the
box and appears in **Dossier Patient**, in the open visit's card, with the doctor's
name and time (and when it was last changed). The chart lists every visit newest first;
the visit that is open stays at its own date and is marked by a thick blue edge and the
tag **● Dossier ouvert** (an earlier visit opened from the visit list is no longer shown
on top as if it were the latest), and the list scrolls to it. Another doctor's note shows there under
their name and can only be read — an administrator cannot change a doctor's note either.
Opening another patient with an unsaved note asks first; unsaved text is kept on the
computer until it is saved, the user signs out, or a day has passed. Vital signs stay one
set per visit and may be left empty. Payment, pharmacy and reception show every doctor's
note with their name. Old notes are moved to the doctor who opened the consultation
(migration **038**).

### The chart says whose chart it is

The right-hand tab is now called **Dossier Patient** (*Patient Chart*) on the
consultation, payment and pharmacy screens (it was *Visites passées*). Each visit in it is
headed by the department and the doctor the visit was registered with at reception —
«GEN Dr. Grace», not «GEN» alone; a visit registered without a doctor shows the account
that opened the consultation. Who wrote each note is shown on the note itself.

### Change the doctor of a visit (Transfert)

A visit registered to the wrong doctor no longer has to be cancelled and registered
again. **⇄ Transfert** on the patient bar opens a small window: the doctor (every doctor,
with their department) and an optional reason. The department follows the chosen doctor,
and a line says so when it changes. The patient bar, the chart and the queue change at once; notes,
prescriptions and orders stay as they are, and each doctor's note stays theirs. It is
written to the change log. Not possible once the visit is paid (the button is greyed) or
cancelled. Reception can do the same from its screen, and changes a department alone.

### Phrases types: one name, categories from Settings

The list of ready-made phrases under the note is called **Phrases types** (*상용구*), the
same name as in Settings (it was *Dictionnaire*). Its categories are the ones the clinic
makes in Settings, shown in their order and under their own name, and are chosen from a
drop-down (**Catégorie : toutes**) instead of a row of buttons, so any number of
categories fits. The choice is remembered for the account on that computer. A phrase has
one text, whatever the screen language.

### Imaging reports in the document history

The imaging report printed from the **Imagerie** list (one A4 sheet per exam, to go with
the images to another hospital) is listed in the **Documents** window's history like any
other paper, in consultation and at the till: it can be opened again, reprinted and
voided there. It is still made only from the imaging list.

### Opening a patient no longer starts the consultation

Clicking a patient in the waiting list used to put the visit "in consultation" at once.
A doctor who clicked the wrong name and left had changed nothing — but reception saw the
patient as being seen, could no longer cancel the registration, and an empty consultation
stayed in the patient's chart. The director decided that opening is reading. A line at the
top of the middle column now says where the visit stands — *En attente*, *En consultation*,
*Terminé* — with one button: **▶ Commencer la consultation** on a waiting visit. The
button is not required: the first thing saved (a note, a vital sign, a drug, an exam) or
**Terminé** starts the visit by itself. A consultation started by mistake goes back with
**↩ Remettre en attente**, offered only while nothing at all is recorded; the server
checks again and refuses if a second doctor wrote in the meantime. A visit that was only
opened leaves no consultation behind.

One thing changes for reception as a result: a visit the doctor saw without saving
anything and without pressing **Terminé** stays *En attente*, and reception's
**Terminer →** on a waiting visit closes it without the consultation fee. Doctors should
press **Terminé** for every patient they see.

### Each account chooses whose patients its waiting list shows

A doctor's waiting list showed that doctor's patients and the patients registered with
no doctor; every other account saw everyone, and nobody could change it. A **⚙** button
at the top of the waiting list now opens the list of doctors: tick the ones whose
patients you want to see, and whether to include the patients with no doctor. The count
on the waiting-list button follows. The choice is kept for the account, so it is the
same on another computer; accounts that never open it see what they saw before. A line
under the search box always says whose patients are listed.

### Allergy warning when a patient is opened; the reception memo has its own place

The red allergy tag in the patient bar stays, and opening a patient who has an allergy
now also stops the doctor once with a window naming the patient and the allergy; it
closes only with **OK** (or Enter). It appears each time another patient or another visit
is opened, from the waiting list, the patient finder or the visit list, and never on the
screen's own refreshes. The visit's reception memo, which used to sit in the patient bar
beside the allergy, moved to a box on the left, under the queue buttons and above the
prescriptions; it shows only when there is a memo, and a long one scrolls inside the box.
Issuing a document for a visit still waiting now puts that visit in consultation, like
any other record.

### One way to find a drug

The green **+ Recherche médicament** button and its window are gone: the box under it
already found drugs, exams and procedures as you type. The window did one thing the box
could not - show every match - because the box stopped at eight drugs. With
**Médicament** (or **Examen / Imagerie**) chosen above the box, the list now shows up to
fifty matches and scrolls; under **Tout** it stays short and ends with a line saying how
many more there are. Two letters are needed to search; browsing the whole drug list
without typing is no longer possible.

### Smaller changes on the screen

- The patient bar's list of the patient's images and readings is called **Imagerie**
  (*Imaging*; it was *Compte-rendu*). The reading box in the image window keeps the name
  **Compte-rendu**.
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
  the patient was opened again). The **Unité** box no longer shows the body part cut to
  four letters (the body part is in the name's tooltip).
- An order line's **Posologie** box starts empty and takes words (`PRN`, up to 20
  characters): it used to start at « 1.000 » on every procedure line, and the server
  accepted only a number there. A procedure done on a device (endoscopy, rectoscopy)
  starts 1 · 1 · 1 like an imaging exam.

### Not visible on the screen

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

Details: `wiki/modules/consultation.md`, section 8.

### After updating

- **Enter drug prices before the first patient.** A line keeps the price it was
  prescribed at; a line written at price 0 stays at 0 after the price is set, unless the
  doctor removes it and adds it again.
- **Rebuild the order sets' drug lines.** After the drug import the example drugs are
  hidden, so the existing sets add only their exams until their drug lines are replaced
  in Settings — with the daily total, times and days, which are no longer taken from the
  drug.

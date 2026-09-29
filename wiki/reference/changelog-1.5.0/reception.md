## Registration

### Cancelling a waiting patient works — and no longer cancels one the doctor has opened

The **Cancel Waiting / Remove** button sent the status `canceled`, with one *l*; the API and the
database only accept `cancelled`. Every press ended in an error, so a patient who left
without being seen could not be taken off the queue from the screen at all.

With the spelling fixed, a second problem would have followed: the registration queue
did not refresh by itself, so the button could be pressed on a patient the doctor had
opened minutes earlier, stranding a consultation, its orders and its bill under a
cancelled visit that every other screen ignores. The server now cancels only a visit
that is still waiting, and answers otherwise with a message that says why.

### Editing a registration no longer undoes the doctor's work

Saving a change to a queued visit — a corrected complaint, a different doctor — sent
back the status the visit had when it was clicked. If the doctor had finished in the
meantime, the visit went back to *waiting*: it reappeared in the doctor's queue and
dropped off the payment list, so the patient could leave without paying. Reception now
sends only the fields its form edits, and the queue refreshes itself every 30 seconds
while the tab is visible, without touching what is being typed.

### A patient is registered once, even when the button is pressed twice

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

### First visit, follow-up or no fee is chosen at the desk

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

### A work date, so yesterday's leftovers can be found

The queue only ever showed today. A patient left waiting or in progress at closing time
vanished from every screen while still counting as active in the statistics. The top
left of the screen now has a work date — previous day, calendar, next day, back to
today — like the clinic's own system. A past day is for looking and tidying up only
(cancel, complete); new registrations and edits happen on today's date. "Today" comes
from the server, not the PC's clock, and a screen left open over midnight moves to the
new day by itself.

### Chart numbers start again at 1 each year

The first new patient of 2027 is `27-00001`. Numbers used to come from one sequence
running across years with the year in front (`26-00350` → `27-00351`), and past 99,999
they were cut to five digits and collided. The next number is now the year's highest
plus one, taken under a lock in the same transaction as the new patient, so two desks
cannot get the same number, and it is right after a backup is restored on another PC
because nothing depends on a sequence value. Numbers already issued are unchanged; this
year carries on from the highest. Past 99,999 a sixth digit is added.

### Smaller changes staff will notice

- The sex buttons start unpressed and a patient cannot be saved until one is chosen —
  with *Male* pre-selected, women registered in a hurry were saved as men, and sex goes
  onto documents and to the imaging devices.
- Messages are in the screen's language: missing name or sex, an incomplete or impossible
  birth date, the server being unreachable, a record that no longer exists. Confirmations
  are sentences ("Patient mis en attente — RAKOTO Jean (N° dossier 26-00001)") instead of
  a button label with a tick. The birth-date boxes read AAAA / MM / JJ in French, and
  typing the month first no longer moves it into the year box.
- Patient search finds a name typed first-name-first, and `%` or `_` in the box are
  searched as characters instead of matching everyone.
- In the find-patient window used by consultation, payment and the lab, a visit
  cancelled at reception is greyed out and labelled.

### Under the hood

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

Details: `wiki/modules/reception.md`, section 8.

### After updating

- Tell the desk: the sex must now be chosen; the visit type buttons replace the fee
  correction at the till; the work date is where yesterday's leftovers are tidied up
  each morning.
- Accounts given a narrow set of permissions by hand: the registration screen and the
  patient APIs need **Registration** (*Enregistrement* on the French screen). Accounts
  created with the Front desk or Nurse role already have it.
- Chart numbers: nothing to do. This year continues from the highest number issued; the
  first patient of next year gets `YY-00001`.

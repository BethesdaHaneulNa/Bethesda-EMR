# Changelog

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

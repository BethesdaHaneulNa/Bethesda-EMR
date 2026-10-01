## Laboratory

### Results typed the French way are read correctly

The flag on a result was worked out with `parseFloat`, which stops at the first
character it does not expect. The staff at the clinic write French numbers, so a
creatinine of `1,5` was read as 1 and filed as normal, and a white count of `12 000`
as 12. Nothing looked wrong on screen: the value was stored as typed, only its
judgement was off. A single comma is now read as the decimal point and a space before
three digits as a thousands separator, on the screen and on the server alike. The value
itself is still stored exactly as it was typed.

### Editing a panel in Settings no longer empties the results already entered

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

### A test reaches the lab as soon as it is ordered

The lab's list used to show an order only once the doctor had closed the consultation,
but patients usually go to the lab in the middle of it and come back with the result.
An order now appears as soon as it is placed, marked *In consultation* while the
consultation is open. The list refreshes itself every 30 seconds. Visits cancelled at
reception no longer appear. (Which day the lists show: see the work date, below.)

Saving on *All* used to stop at the first test with nothing typed in, after the tests
before it were already completed. Only the tests with something entered are saved now;
the rest stay pending, and the screen says which is which.

### Text results are flagged, and repeats and cancellations are shown for what they are

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

### Reference ranges by sex and by age

Every item had a single range, so the default Hb of 13–17 g/dL (an adult male range)
flagged most healthy women and children as low. An item can now carry rows by sex and
age band, entered in Settings; the server picks the row that fits the patient's sex and
age on the day of the test, and falls back to the item's own range when the birth date
or sex is unknown. Overlapping rows for the same sex are refused, so it is always clear
which row applied. The range and the row used are saved with each result, so editing
the ranges later never changes how an old result was judged.

**No values are entered by this update.** Reference ranges depend on the analyser and are
the doctors' decision. A table of the ranges used by Korean laboratories, with sources,
is in `wiki/reference/lab-reference-ranges-kr.md`, and a one-page questionnaire for the
doctors in `wiki/reference/lab-reference-questions.md`.

### A work date, as at reception and payment

The lab's lists showed today and nothing else; a test left from an earlier day could only
be reached by searching for the patient. The screen now has the same work date as the
reception and payment screens, at the top of the list: step back a day or pick a date,
and *Pending* and *Completed*, with their counts, are those of that day's visits. A past
date is shown in amber with a button back to today; "today" is the server's, not the
PC's clock. A result entered while a past date is shown is filed under the visit's date,
as before. *Completed* now means the tests of that day's visits that have a result — it
used to mean the results entered today, whatever the visit's day. The patient search
still opens a test of any day.

Under the work date there is a search box, as on the payment and pharmacy screens: it
narrows the list on screen by patient name, chart number or test name, and says so when
nothing in the list matches.

### Units are picked from a list the clinic keeps

The unit of a test item was typed by hand on every row, so the same unit ended up
written several ways. In Settings → Lab Test Items the unit is now picked from a list,
and a *Unit list* button beside *New panel* opens the list itself: add, rename, reorder,
remove. The list is only what the box offers. An item keeps its unit as text and a result
keeps its own copy, so removing or renaming a unit changes no item and no result — the
window says how many items use it before saving, and those items go on showing their
unit, marked *not in the list*. Two names that differ only by capitals or spaces count as
the same unit and the second is refused. The list starts with the common units and every
unit the clinic's items already use, spelled the way the clinic spelled them.

### Less visible

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
- In the lab's entry table a very long unit or item name put that row's boxes out of
  line with the others; it now wraps inside its cell.
- A migration adds the `lab_unit` table (the unit list). It changes no existing row.
- Migration `024_lab_ref_ranges.sql` adds the `lab_ref_range` table and
  `lab_result.ref_label`. It only adds; nothing existing is changed.

Details: `wiki/modules/laboratory.md`, section 8.

### After updating

- Reference ranges are unchanged until someone enters them. Once the doctors have filled
  in the questionnaire, enter the chosen values in Settings → Lab Test Items, following
  section 2 of `wiki/modules/laboratory.md` (“entering confirmed reference ranges”).
- Results entered before this update keep the flag they were saved with. A result typed
  with a comma before the update may carry a wrong flag; opening it and saving it again
  recomputes it.

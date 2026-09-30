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
run again. The staff guide in French (`wiki/manual-fr`) was written from those screens.

The screen can now be light as well as dark, chosen by each person, and the dark screen
was brought up to the same contrast line as the light one - measured, not judged by eye.

Migrations 019 to 037 are applied by the server when it starts. **Take a backup before
updating and another one after**: a backup from before the update cannot be restored onto
the updated EMR with the everyday commands (`DEPLOYMENT.md`, 5b).

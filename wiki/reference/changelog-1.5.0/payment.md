## Payment

### One receipt per payment, even when the button is pressed twice

Nothing stopped a double click on **Confirm Payment**, and two cashiers could bill the same
patient at the same moment: each got a receipt, and the day's takings were counted
twice. Every button that writes money now locks while its request runs, and the server
refuses a bill for a visit whose receipts changed since the screen was opened (the
screen reloads and says so). The same check stops a patient's earlier balance from
being added to two new receipts.

### Corrections record the cash actually held, and hand back only the difference

When items were removed after payment, the screen voided the receipt and wrote a new
one with figures of its own: a bill that had never been paid came back as paid in full,
the refund was taken off the takings a second time, and discounts, certificate fees and
carried balances were dropped. The correction is now worked out by the server in one
step from the money really received, keeps discount, counter fees and carried balances,
and shows on the waiting list what it will do — **To refund N**, **Left unpaid N** or
**No money difference** — the same figures as the correction screen. Leaving a bill
unpaid now always leaves the whole total owed.

### Cancelling a receipt asks whether the money went back

In Madagascar patients pay cash, so an overcharge is corrected and only the difference
is handed back; cancelling a whole receipt is rare. The cancel dialog now says so, asks
for a reason, and asks *did you give the money back?* The answer is recorded (and
printed on the cancelled receipt), and a re-bill starts from the cash still at the till
— all of it, even when several receipts of the visit were cancelled.

### Money is counted on the day it moves

Every payment, balance settlement, correction refund and refund on cancelling writes
one row to a cash record that cannot be edited. A day's total is the till: correcting or
cancelling yesterday's receipt no longer takes yesterday's takings down to zero and
moves them to today. Statistics switch to this record in the statistics update; the
payment screen's "cash of the day" line follows the new light theme.

### Balances paid later are dated the day they are paid

Settling an old balance raised the old receipt's amount, so the money showed on the day
of the first visit and never on the day it reached the till. **Collect unpaid** now
issues a new receipt dated today, one per visit when several are settled together.

### A clear French receipt from the stored bill

Right after payment the receipt came out blank with a 0 Ar total, and reprints left out
discount, change and balance. There is now one A4 receipt, always in French, printed
from the stored bill: clinic details from Settings, items with quantities (**2 flacons**
for syrups and creams), discount, amount handed over, change, balance, and the receipt
it replaces or the one its balance moved to.

### What is billed follows the doctor's orders exactly

- Drug quantities are the total the consultation saved; payment no longer keeps a
  formula of its own. A line with no total is flagged and cannot be billed by mistake
  as 0.
- Orders are billed as quantity × days (an injection once a day for 5 days = 5).
- Orders the doctor cancelled are not billed; if they were already paid, the visit
  comes back for a correction.
- Lines with no price are marked *No price* (*Sans prix*) and asked about once, not refused.
- The consultation fee is read in one place from Settings; a missing fee code counts
  as 0 with a warning instead of a hidden built-in price.

### The waiting list shows only what needs doing

Receipts for certificate or CD fees no longer bring a patient back as a refund. A visit
that ended part-paid leaves the list (its balance is collected from **Receipts**). An
earlier day's visit that was never billed now appears with its date — reception can
close yesterday's leftovers with its work date. A visit cancelled at reception shows a
notice and cannot be billed. The visit type offers **New Visit**, **Follow-Up** and **No fee**.

### Behind the scenes

The server checks that items, subtotal, discount and total add up, and that change,
balance and status follow from what was paid. A debt carried into a later receipt
cannot be collected or cancelled twice. The payment API needs the payment permission
(the balance shown at reception, registration too). Cancellations and corrections are
written to the change log. Screen texts left in English were translated.

Details: `wiki/modules/payment.md` section 8.

### After updating

- Migrations `027_payment_billing_visit_index.sql`, `031_payment_item_pack_label.sql`,
  `033_payment_cancel_refund.sql`, `036_payment_cash_movement.sql` run on start.
  `036` writes one *opening* row per existing receipt, so past days keep the figures
  they had. Check once: `SELECT kind, COUNT(*), SUM(amount) FROM cash_movement GROUP BY kind;`
  — the opening total equals the takings of all receipts in force.
- Make a backup after the update (the cash record is new data).
- Staff guide: `wiki/manual-fr/payment.md` — especially *Correction* (hand back only
  the difference) and the new question when cancelling a receipt.

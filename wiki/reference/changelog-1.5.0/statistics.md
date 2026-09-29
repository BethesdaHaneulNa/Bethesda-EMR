## Statistics

Every figure on the Statistics screen was checked against a hand calculation on test data, and against the payment and pharmacy screens it summarises. Several did not agree. The details, with the reasoning and the tests, are in `wiki/modules/statistics.md` (sections 3 and 8).

### Debts already paid no longer show as owed

When an old debt was added to a later receipt and paid there, the statistics still counted it against the old receipt. The patient stayed on the debtor list, with a phone number, for money they had already paid, and a partly paid carry-over was counted twice. The Unpaid and Refund due cards and both lists now use the same figures as the patient balance on the payment screen. The card total and the list total now agree. A patient who both owes money and is owed some now appears on both lists, as on the payment screen, instead of the two being netted.

The list's "Since" column now shows the date of the oldest treatment still unpaid. It used to show a day early, because dates were converted to UTC on the way out. After a partial payment or a carry-over it also showed the date of the receipt now holding the debt, rather than when the debt began.

### Visit counts add up

Cancelled registrations were counted as visits in the total, the new/follow-up split, unique patients, the department and doctor charts and the monthly trend. They now count only in their own Cancelled card. A new **No fee / other** card holds visits with no consultation fee, and the emergency and referral types that older records still carry. Total visits now equals new + follow-up + no fee/other.

A visit with no department or no doctor used to disappear from the doctor charts. It now shows as an **Unassigned** row. Two staff with the same name are no longer merged into one row.

### Department and doctor revenue add up to takings, and follow the treatment

Doctor revenue left out visits with no attending doctor, so its rows summed to less than the takings, whatever the v1.4.0 notes said. Both charts now include every receipt. When an old debt is carried onto a later visit's receipt, the money is credited to the department and doctor of the visit that created the debt. A partial payment settles the oldest debt first, as carry-over does. Before, the doctor who happened to collect it got the credit. Money still counts on the day it was paid.

Document fees were drawn twice under revenue by item: once inside procedures and again as documents. The four item bars now add up to the billed amount.

### The average is per visit, and settlements are counted apart

The average used to be cash collected divided by receipts. Unpaid receipts, old debts collected and extra receipts on the same visit all moved it. It is now **Avg billed / visit**: the amount billed divided by the visits billed. The receipt count now covers treatment receipts only. Receipts issued when a patient pays an old debt appear beneath it as "+ N balance settlement(s)", and the money is still counted in the takings.

### Cancelled receipts: staff cancellations only, with the money handed back

The Voided card counted both receipts cancelled by staff and receipts replaced by a correction, which are not refunds. It now counts staff cancellations only. Beneath it, **Handed back** shows the cash returned when those receipts were cancelled, on the day of the cancellation. The difference returned at a correction is not included, because the correction receipt's takings already exclude it. Receipts cancelled before this release, when nobody was asked, are left out of that amount rather than guessed.

### Drug usage

- The table has its own period (two date fields). Before, it always showed a fixed 30 days, 12 months or 5 years.
- **Dispensed** now follows the same rules as the pharmacy's new monthly stock report: it counts by the day the drug was handed over, in-house drugs only, rounded up to whole units. The two screens now give the same figure for the same month. **All prescriptions** still counts what was prescribed, by visit date. A line under the table says which rules apply.
- Outside prescriptions no longer count as dispensed. The dispense button marks them dispensed, but only a paper prescription left the building.
- Prescriptions of a cancelled registration are no longer counted, unless the pharmacy had already handed the drug over.
- Pack-unit drugs (syrups, inhalers, creams handed out by the bottle or tube) show their unit next to the name. Their bottle lines stay apart from any older dose lines of the same drug.
- The cross-drug total and the "total used" figure are gone. They added tablets to bottles. Each drug keeps its own total, and the CSV has a unit column.

### Smaller changes

- The monthly trend shows quiet months as zero instead of skipping them.
- The French and English screens no longer show Korean text: the Cancelled label, the "unassigned" text, and the unit after counts. Department names follow the screen language.
- The debtor list is loaded when it is opened, and the trend when the page opens, instead of on every change of dates.

Not in this release: statistics by cash movement. The office manager decided on 2026-09-29 that the figures for a day should be the money that actually came in and went out. The payment session's cash record is being built first, and this draft will be updated when that work is merged.

### After updating

- Tell the office staff before they open Statistics. The Unpaid total may be lower, because debts already paid through carry-over are no longer counted. Total visits leave out cancelled registrations. The average card has a new name and a new meaning.
- No statistics migration. The figures depend on the database connection using the clinic's time zone, which this release fixes centrally. Check that `TZ` in `.env` is `Indian/Antananarivo`.

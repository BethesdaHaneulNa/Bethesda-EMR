## Settings

### Order sets decide the dose, the times and the days

An order-set line showed the drug's defaults as read-only text ("3.000×3×7"), and the drug form was
where a dose was set. The director's point, looking at the screen: the dose belongs to the set, not to
the drug. With the drug defaults gone from the drug form, each order-set line now has its own **Dose/j ·
Fois · Jours · Posologie** fields — the same names and order as a prescription line in the consultation
screen, total = daily total × days — and a new drug line starts empty. A line without a daily total or
days is marked and the set cannot be saved: applied to a patient it would have gone in with no total.
Exam and procedure lines have quantity, times and days; pack-unit drugs (syrups, inhalers) keep a bottle
count next to the dosing instructions. Drug saves now change only the fields sent, so a form without
the old default fields cannot wipe them.

### Everyone can change their own password; an admin can bring an account back

Staff had no way to change a password: the initial one stayed until an administrator typed another.
Clicking your own name in the top bar now opens **Changer mon mot de passe** (current password once,
new one twice; no minimum length, by decision). A deactivated account could not be reactivated at all;
an administrator now has **Réactiver**, which brings the account back with the same login, password and
permissions. Both are written to the change log, never the password itself. A nurse role exists
(registration, pharmacy and laboratory by default), and a new doctor account gets pharmacy along with
consultation. The first-run setup account is always `admin`, so the lock-out protection always
recognises it.

### A change log nobody can edit — the Journal tab

There was no record of who changed a lab result, a finished consultation, a receipt or a patient's
details. The modules now write each such change to `audit_log`, and **Paramètres → Journal** shows it:
when, who, what, which patient, old value → new value, filtered by date, person, type or patient. The
table refuses UPDATE, DELETE and — found during a restore drill, where it emptied the whole log —
TRUNCATE (migration 026). Staff account changes are logged by Settings, and so are prices when they
change (old price → new price; the director's decision): a drug's, including the first price of an
imported drug, and an order code's (consultation fees, lab tests, imaging, procedures). Every document
issued or voided is listed too (number, document, language, reason for voiding - never its content).
The Journal opens without the issued ones, which are many, and says how many are folded away; one tick
shows them. Voided documents are always shown.

### Backups you can trust, and that say when they cannot be restored

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

### What is wrong, seen from any screen

The status checks existed only in the server PC's window. Accounts with the settings permission now
have a small dot next to the clock — green, yellow, red, or grey when the server does not answer — and a
click lists each check in words. The server status window also learned to see ports Windows had
reserved (the PACS was "healthy" and unreachable on this PC), the image backup to an external disk,
imaging addresses still on the old ports 8080/8090, and the database's drive as well as the backups'.
Since the night image backup also copies the EMR's backups to the same external disk (the director's
decision), both the dot and the window have a line for that copy: disk missing, copy failed, or no
copy for 36 hours. The Backup tab says so instead of asking for another drive in `.env`.

### Smaller

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
Details: `wiki/modules/settings.md` section 8.

### After updating

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

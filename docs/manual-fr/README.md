# Guide du personnel (français)

The printed French guide for the clinic's staff (reception, nurses, doctors,
administrators). One file per module; `node docs/manual-fr/build.mjs` joins them into
one printable HTML page (cover, table of contents, a chapter per module).

| File | Module | Readers |
|---|---|---|
| `reception.md` | Reception | reception staff, nurses |
| `consultation.md` | Consultation | doctors |
| `payment.md` | Payment | reception / cashier |
| `pharmacy.md` | Pharmacy | nurses |
| `laboratory.md` | Laboratory | nurses |
| `statistics.md` | Statistics | administrators |
| `settings.md` | Settings | administrators |
| `pacs.md` | Imaging | radiographers, doctors |
| `design.md` | Screen colours | everyone |

## Writing rules

1. **French only.** Short sentences, imperative (« Cliquez sur … », « Saisissez … »);
   the words on the screen rather than technical terms.
2. **Screen text exactly as in `frontend/src/i18n/fr.js`**, in bold: **Enregistrer**,
   **Terminé**. Check against a running isolated stack in French before writing.
3. Same outline in every file: `# <module>` with one line on what the screen is for,
   `## En bref` (the most common task in 5-8 steps), `## Pas à pas`,
   `## Si ce message apparaît` (table: message as shown, meaning, what to do),
   `## À ne pas faire`, `## Qui appeler`.
4. Patient names and numbers are **fake only** (e.g. RAKOTO Jean, 26-00001). Never real
   patient data, passwords or tokens.
5. 2-4 printed A4 pages per module; common tasks first.
6. Do not describe features the EMR does not have yet. Mark a screen about to change with
   `<!-- à revoir : … -->`, and an uncertain French term with
   `<!-- terme à vérifier sur place : … -->` (the build lists both on the console).

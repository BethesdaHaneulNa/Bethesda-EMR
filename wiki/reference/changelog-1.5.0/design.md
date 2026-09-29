## Design — a light screen

Until now the EMR had one look: dark. That suits a dim room, but the clinic's consulting rooms get the sun and many of its monitors are old laptops at 1366×768, where pale grey text on near-black is hard to read. The details, with the measurements and the tools, are in `wiki/modules/design.md`.

### The screen can be light or dark, and each person chooses

Next to the language buttons in the top bar there is a new two-part switch: **🌙 Dark** and **☀ Light** (**Sombre** / **Clair** in French, **어둡게** / **밝게** in Korean). The chosen part is filled. Pressing the other changes every screen at once: registration, consultation, payment, pharmacy and stock, laboratory, statistics, settings, and the windows they open (patient search, chart, documents, imaging reports).

The choice belongs to the account, not to the PC. A nurse who chooses the light screen at the front desk finds it light at the pharmacy PC too, and the doctor who logs in after her on the same PC gets the screen the doctor chose. The login screen does not know who is coming, so it shows the screen that PC showed last.

Every account starts on the dark screen, so nothing changes for anyone until they press the switch.

### What stays the same on both screens

- **Anything on paper.** Receipts, prescriptions, surgical records, referral letters and their previews are white sheets as before, and the letterhead preview in Settings too. Printing is untouched.
- **The patient band** on the consultation screen: the dark blue row with the patient's name, chart number and allergy. It is the one thing a doctor must find without looking, so it does not move or change colour.
- **The image viewer**, which stays black.
- **What the colours mean.** Blue is waiting or chosen, amber is in progress or a notice, green is done or received, red is cancelled, unpaid or a warning, violet is a correction. No colour stands alone: each has its word or sign beside it (▲ ▼ ⚠ ✓), as before.
- **The dark screen itself.** It is, colour for colour, the screen v1.4.0 had. This was checked rather than assumed: the computed colour of every element on sixty states of the screens was compared before and after, and none differs.

### The light screen was measured, not judged by eye

On the light screen every text meets WCAG AA against the background it actually sits on (4.5:1, or 3:1 for large text), including grey hints, coloured status words and text on coloured buttons, and every input has a border of at least 3:1. Inputs are white boxes with a visible outline. Buttons that were a bright colour with near-black text (in-house / outside in the pharmacy, receive / count / discard in stock, the laboratory's panel buttons) become a deep colour with white text on the light screen, because the bright ones would not carry white or black text well on white.

Three things are below the line on purpose and listed in the wiki: disabled buttons, large emoji used as pictures, and the faded "generated automatically" hint in the chart number box.

### Known: the dark screen has a few texts below the same line

Measuring the light screen meant measuring the dark one. Five things on it fall short of WCAG AA: the faintest grey text, blue and red used as text in a few places, white text on the blue and green buttons, and the outline of inputs. They are as they were in v1.4.0; this release does not change the dark screen. Whether to adjust them is a separate decision (`wiki/modules/design.md`, section 7).

### For developers

- The screens are styled with inline objects and had about ninety colours written into them. They now read tokens: `var(--panel)`, `var(--text-2)`, `var(--accent)`. The values are in one place, `<style id="bethesda-theme">` in `frontend/index.html`: `:root` holds the dark values, `:root[data-theme="light"]` the light ones. The block is generated from the table in `wiki/reference/design/tokens.mjs`, which also checks the light values for contrast. Change the table, not the block.
- A token names a role, not a colour. `#0f1117` was both the page and the background of an input; on a light screen those differ, so they are `--bg` and `--field`. When adding a colour to a screen, pick the token for what it paints. Do not write `#…` into a screen file.
- A colour with an alpha is a token of its own (`--accent-a18`), built with `tint('accent', '18')` from `frontend/src/theme.js`. `color-mix()` would be shorter but needs Chrome 111, and the clinic's oldest PCs stop at Chrome 109, where an unknown function drops the whole declaration.
- A few lines of script in `index.html` set the theme before the first paint, from the PC's last choice in `localStorage`, so a light screen never flashes dark.
- `GET` / `PUT /api/theme` read and store the choice for the signed-in account only. The account is taken from the token; any value but `dark` or `light` is refused; nothing is written to the change log. Migration **037** adds `staff.theme` with `'dark'` as the default. The staff list in Settings does not carry the new field.
- Tools in `wiki/reference/design/`, none of them part of the app: `retoken.mjs` and `fields.mjs` turn a screen's colours into tokens, `check-dark.mjs` proves by substitution that a file's dark colours did not change, `compare-in-browser.js` compares computed colours before and after, `audit-in-browser.js` lists every text on the light screen that falls below WCAG AA. `backend/test/design.theme.mjs` checks the API on an isolated stack.

### After updating

Nothing to do. Migration 037 runs by itself and every account stays on the dark screen until its owner presses the switch.

Opening the EMR with `?theme=light` or `?theme=dark` at the end of the address sets that PC's screen without the switch. It was the preview used while the screens were being converted; it is harmless, and once someone logs in their own choice applies.

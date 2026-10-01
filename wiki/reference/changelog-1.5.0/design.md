## Design — a light screen

Until now the EMR had one look: dark. That suits a dim room, but the clinic's consulting rooms get the sun and many of its monitors are old laptops at 1366×768, where pale grey text on near-black is hard to read. The details, with the measurements and the tools, are in `wiki/modules/design.md`.

### The screen can be light or dark, and each person chooses

Next to the language buttons in the top bar there is a new short list that shows the screen in use, for example **🌙 Dark ▾** (**Sombre** / **Clair** in French, **어둡게** / **밝게** in Korean). Opening it and choosing another line changes every screen at once: registration, consultation, payment, pharmacy and stock, laboratory, statistics, settings, and the windows they open (patient search, chart, documents, imaging reports).

The choice belongs to the account, not to the PC. A nurse who chooses the light screen at the front desk finds it light at the pharmacy PC too, and the doctor who logs in after her on the same PC gets the screen the doctor chose. The login screen does not know who is coming, so it shows the screen that PC showed last.

Every account starts on the dark screen, so nothing changes for anyone until they press the switch.

### A third screen: warm paper

Beside dark and light there is a third choice, **📄 Paper** (**Papier**, **종이색**): the light screen on a warm, slightly yellow ground, like paper. It glares less than white, which some eyes prefer for a long day. The director asked for it after looking at the first mockups again (2026-10-01). It works exactly like the other two: one press, remembered with the account, on every screen and on the login screen. Its text and outlines were deepened until they meet the same contrast line as the light screen, because paper is a little darker than white. Dark stays the screen every account starts with.

### Payment, pharmacy and laboratory look alike

These three screens are built the same way (tools on top, the patient list on the left, the work in the middle, the patient's history on the right) but each had its own sizes. They now share them: the tool row and its buttons, the waiting / done tabs (tinted, with the count in brackets), the refresh button right after the tabs, the list (name, second line, a small boxed tag for "waiting" or "in consultation"), the notice in the empty middle, and the width of the right-hand column. The title line above the list, which repeated the chosen tab, is gone, so one more patient fits. The waiting drawer of the consultation screen and the work-date line of the reception screen follow the same sizes. Nothing changed in what the screens do, and each keeps its own colour.

### What stays the same on every screen

- **Anything on paper.** Receipts, prescriptions, surgical records, referral letters and their previews are white sheets as before, and the letterhead preview in Settings too. Printing is untouched.
- **The patient band** on the consultation screen: the dark blue row with the patient's name, chart number and allergy. It is the one thing a doctor must find without looking, so it does not move or change colour.
- **The image viewer**, which stays black.
- **What the colours mean.** Blue is waiting or chosen, amber is in progress or a notice, green is done or received, red is cancelled, unpaid or a warning, violet is a correction. No colour stands alone: each has its word or sign beside it (▲ ▼ ⚠ ✓), as before.
- **The layout, the words and the behaviour.** Only colours changed. While the light screen was being built the dark one was kept, colour for colour, as v1.4.0 had it, and this was checked rather than assumed: the computed colour of every element on sixty states of the screens was compared before and after each step.

### The light screen was measured, not judged by eye

On the light screen every text meets WCAG AA against the background it actually sits on (4.5:1, or 3:1 for large text), including grey hints, coloured status words and text on coloured buttons, and every input has a border of at least 3:1. Inputs are white boxes with a visible outline, and the example text inside an empty one follows the theme instead of the browser's own grey. Buttons that were a bright colour with near-black text (in-house / outside in the pharmacy, receive / count / discard in stock, the laboratory's panel buttons) become a deep colour with white text on the light screen, because the bright ones would not carry white or black text well on white.

Three things are below the line on purpose and listed in the wiki: disabled buttons, large emoji used as pictures, and the faded "generated automatically" hint in the chart number box.

### The dark screen was brought up to the same line

Measuring the light screen meant measuring the dark one, and it fell short in places: the faintest grey text (labels, table headings, hints) was 3.3:1 against the 4.5 it needs, the text on the blue and green buttons 3.7 and 2.5, the outline of an input 1.4 against 3. On a dim monitor with the sun on it, that is text that is not read and a box that is not found. The director decided to correct it (2026-09-30).

On the dark screen the grey text is now lighter, every input has a visible outline, the example text inside an empty input reads, and the coloured buttons are a deeper shade so that the white text on them stands out. Blue, red and violet used as text are a step lighter. Nothing moved and no colour changed its meaning: the hues are the same, only lighter or deeper. The laboratory's buttons (the panel buttons such as CBC, and Save · Finish) are now deep cyan with white text on the dark screen too, as the director decided, so that on every screen a deep button with white text is the one to press; the cyan of the test names and of the selected patient's marker is unchanged.

Across sixty-four states of the screens the count of texts and outlines below the line went from 137 to 14, and the 14 are disabled controls, large emoji used as pictures, and four places that need a line changed in a screen file (listed in the wiki). The change is in the colour values only. It was checked the other way round from the rest of this work: every colour that differs before and after is one of the decided pairs, and nothing else differs.

### The box you are typing in shows it

The screens had switched off the browser's focus outline on their inputs, so apart from the blinking caret nothing showed where typing would go. The input that has the keyboard now has a blue ring, on both screens, whether it was reached with Tab or by a click. Buttons show the ring only when reached with the keyboard, so pressing one with the mouse does not flash.


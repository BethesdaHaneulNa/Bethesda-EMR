# Animation plans — Bethesda EMR frontend

Produced by an `improve-animations` audit on 2026-07-30 against commit `75f3df3`
(working tree also carried uncommitted v1.4.0 edits; all line numbers in the plans are
from that working tree).

## What the audit found

Not bad animation — **almost no animation**. The whole frontend is React inline style
objects with no CSS file and no motion library, and it contains exactly three
transitions (two Stats bars, one queue drawer). There is no `ease-in`, no
`transition: all`, no `scale(0)`, no `@keyframes` — nothing to undo. The gap is absence.

The two HIGH findings are not cosmetic. With 140 `<button>` elements and no press
feedback anywhere, a click that did not register looks identical to one that did — and
staff press 저장 / 수납 / 처방 hundreds of times a day on a clinical record. That is how
duplicate entries happen.

Deliberately **not** recommended: motion on the patient queue, drug search results and
visit lists. Those are clicked continuously all day, and the rule for that frequency
band is to reduce motion, not add it. Plan 002 excludes 34 of the 42 `<div onClick>`
elements for this reason.

## Plans

| # | Title | Severity | Scope | Status |
| --- | --- | --- | --- | --- |
| [001](001-global-motion-tokens-and-press-feedback.md) | Global motion tokens + press feedback for every button | HIGH | 1 file, ~25 lines | **DONE** 2026-07-30 |
| [002](002-pressable-on-div-buttons.md) | `.pressable` on the eight div-based buttons | HIGH | 6 files, 8 lines | **DONE** 2026-07-30 |
| [003](003-stats-bars-animate-transform.md) | Stats bars animate transform, not width/height | MEDIUM | 1 file, 2 lines | **PARTIAL** — easing applied, transform conversion refused |
| [004](004-honour-prefers-reduced-motion.md) | Honour `prefers-reduced-motion` | MEDIUM | 2 files, ~15 lines | **DONE** 2026-07-30 |

Applied on top of v1.4.0 and verified in the built container: `medconnect-motion` and the
reduced-motion query are present in the served `index.html`, and `pressable` appears 8 times in
the JS bundle. All five containers healthy afterwards.

**003 is deliberately PARTIAL.** Reading `Bars`/`VBars` closely before editing showed that
`scaleX`/`scaleY` would distort the bars' corner radii and break the `minWidth:3` floor that
keeps tiny values visible — for a once-per-data-load animation that is a bad trade. The free
half (300ms bare `ease` → 250ms `cubic-bezier(0.23, 1, 0.32, 1)`) was applied. See that plan's
**Outcome** section for what a proper fix would require.

Also applied while adding the drawer's `data-motion` hook: the queue drawer's bare `ease` became
`--ease-drawer` (`cubic-bezier(0.32, 0.72, 0, 1)`), which closes the LOW finding listed below.

## Execution order and dependencies

```
001 ──┬── 002        (002 applies the .pressable class 001 defines)
      ├── 004        (004 appends to the style block 001 creates)
      └── 003        (003 uses 001's --ease-out token)
```

**Run 001 first.** It is the only plan that unblocks the others, it touches one file, it
changes no component, and on its own it fixes the highest-severity finding for all 140
real buttons. If only one plan is ever run, run that one.

After 001, the remaining three are independent of each other and can go in any order.
003 can technically run without 001 by inlining `cubic-bezier(0.23, 1, 0.32, 1)`, but
there is no reason to.

## Findings left unplanned

Reported in the audit, not turned into plans:

- **LOW** — the queue drawer (`Consultation.jsx:411`) uses the browser default `ease`;
  entering/exiting motion wants `ease-out`. Target: `cubic-bezier(0.32, 0.72, 0, 1)`.
  Its 250ms duration is already correct.
- **LOW** — loading states are bare text (`LabResults.jsx:23` returns `Loading…`), so
  content teleports in when the request lands. A skeleton matching the table shape would
  cover the gap.
- **Missed opportunity** — the save toast (`Settings.jsx:768`) appears and vanishes with
  no transition. Toasts can stack and re-fire, so if it is ever animated it must use a
  transition rather than `@keyframes`, which restart from zero.
- **Missed opportunity** — cohesion: the queue drawer slides to explain where it came
  from, while every modal in the app simply appears. Worth a decision either way.
- **Missed opportunity** — the four Stats charts render simultaneously with no stagger.
  A 30–80ms stagger would help read them as groups, but stagger is decorative and must
  never delay interaction, so it is low value on a clinical screen.

## Notes

- These plans do not modify source code; they are specifications. Each one is
  self-contained — file paths, current code, exact curves and durations — so it can be
  executed by any agent without the audit conversation.
- Every value comes from the audit playbook, not from taste: press feedback is
  `scale(0.97)` at 160ms, UI motion stays under 300ms, and only `transform` and
  `opacity` are animated.
- This is a clinical tool used on desktop all day. Every plan errs toward quick and
  utilitarian; none of them adds delight for its own sake.

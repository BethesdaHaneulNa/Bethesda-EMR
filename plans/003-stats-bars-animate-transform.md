# 003 — Animate the Stats bars with transform instead of width/height

- **Status**: PARTIAL — see Outcome (applied 2026-07-30)
- **Depends on**: 001 (uses the `--ease-out` token; can be done standalone by inlining the curve)
- **Commit**: 75f3df3 (working tree also carries uncommitted v1.4.0 edits; line numbers below are from the working tree)
- **Severity**: MEDIUM
- **Category**: Performance (§5), with an easing correction from §2
- **Estimated scope**: 1 file (`frontend/src/pages/Stats.jsx`), 2 lines changed

## Outcome (2026-07-30) — easing applied, transform conversion deliberately NOT applied

Reading `Bars` and `VBars` in full before editing surfaced two costs the audit had not seen, and
they outweigh the benefit on this screen:

1. **The corner radius distorts.** Both fills carry a radius (`borderRadius:5` on the horizontal
   fill, `'4px 4px 0 0'` on the vertical). A radius is drawn in the element's own coordinate
   space and then scaled with it, so `scaleX(0.2)` renders a 5px horizontal radius as 1px while
   the vertical stays 5px. The bars would change shape as they animate, differently at every
   value.
2. **The `minWidth:r.value?3:0` floor stops working.** That floor is what keeps a department with
   a tiny share visible as a 3px sliver. With `width:'100%'` plus `scaleX(ratio)` the layout
   width is already full, so `min-width` has nothing left to clamp and a small value renders
   sub-pixel — it disappears.

Against that: these bars animate **once per data load** (opening the page, changing the date
range), not continuously and not tied to scroll or a gesture. A single 250ms layout pass over
~40 bars is not a frame-rate problem; it is the kind of one-shot work browsers handle fine.

So the free half was applied and the risky half was not:

```jsx
/* frontend/src/pages/Stats.jsx:91 and :108 — applied */
transition:'width 250ms var(--ease-out)'    // was 'width .3s'
transition:'height 250ms var(--ease-out)'   // was 'height .3s'
```

300ms at the ceiling with the browser's weak default `ease` became 250ms on
`cubic-bezier(0.23, 1, 0.32, 1)`. Both fills also gained `data-motion="bar"` for plan 004.

**To revisit properly**, the fills would need to lose their own radius and inherit clipping from
the track (`overflow:hidden` is already there on the horizontal track), and `VBars` would need a
fixed-height track so a ratio exists to scale against. That is a restructure of both components,
not a motion change, and it is not worth it for a once-per-load animation. Leaving this plan
PARTIAL rather than closing it, so the reasoning is not lost.

## Problem

Both bar charts animate a **layout property**, which forces layout → paint → composite on every
frame instead of running on the compositor:

```jsx
/* frontend/src/pages/Stats.jsx:91 — current (horizontal bars) */
<div style={{ width:((r.value||0)/max*100)+'%', background:(r.color||'#3b82f6'), height:'100%', borderRadius:5, minWidth:r.value?3:0, transition:'width .3s' }}></div>
```

```jsx
/* frontend/src/pages/Stats.jsx:108 — current (vertical bars) */
<div title={r.label} style={{ width:'72%', height:Math.max(h,2), background:props.color||'#3b82f6', borderRadius:'4px 4px 0 0', transition:'height .3s' }}></div>
```

Two secondary faults on the same lines:

- `.3s` is **300ms**, sitting exactly on the ceiling the audit sets for UI motion, for what is
  only a value change.
- No easing is named, so the browser applies its default `ease` — a weak curve for something
  that should read as "the value settled".

The cost scales with the page. v1.4.0 added two more bar charts to this screen
(`revenueByDept`, `revenueByDoctor` alongside the existing `byDept` and `byDoctor`), so a clinic
with nine departments and ten doctors now animates roughly forty layout-driven bars at once
whenever the date range changes.

## Target

Animate `transform` — composited, no layout — and scale from the axis the bar grows from:

```jsx
/* frontend/src/pages/Stats.jsx:91 — target (horizontal bars) */
<div style={{ width:'100%', transform:'scaleX('+((r.value||0)/max)+')', transformOrigin:'left center', background:(r.color||'#3b82f6'), height:'100%', borderRadius:5, minWidth:r.value?3:0, transition:'transform 250ms var(--ease-out)' }}></div>
```

```jsx
/* frontend/src/pages/Stats.jsx:108 — target (vertical bars) */
<div title={r.label} style={{ width:'72%', height:'100%', transform:'scaleY('+(props.max?Math.max(h,2)/props.max:0)+')', transformOrigin:'bottom center', background:props.color||'#3b82f6', borderRadius:'4px 4px 0 0', transition:'transform 250ms var(--ease-out)' }}></div>
```

Fixed values, not suggestions: **250ms** (inside the 150–250ms band, and below the 300ms
ceiling) and `--ease-out` = `cubic-bezier(0.23, 1, 0.32, 1)` from plan 001. If plan 001 has not
been applied, inline `cubic-bezier(0.23, 1, 0.32, 1)` instead of the token — do not substitute a
different curve.

**The vertical-bar change needs a height reference.** `VBars` currently computes `h` in pixels
per bar. `scaleY` needs a ratio, so the track must have a fixed height and the fill must scale
within it. Read `VBars` (around `frontend/src/pages/Stats.jsx:102`) before editing and adapt:
if the component has no single track height to divide by, **leave line 108 alone, apply only
line 91, and report that VBars needs a restructure that is out of scope for this plan.** A
half-converted `scaleY` that squashes the border radius is worse than the current code.

## Repo conventions to follow

- All styling is inline objects; keep it that way. React inline styles use camelCase, so it is
  `transformOrigin`, not `transform-origin`.
- Existing motion in this repo already uses a transform transition — imitate it:
  `frontend/src/pages/Consultation.jsx:411` animates the queue drawer with
  `transform:queueOpen?'translateX(0)':'translateX(-290px)', transition:'transform 0.25s ease'`.
  That is the right property and the right duration; only its easing is weak (plan out of scope,
  see the audit's LOW finding).
- Motion tokens live in `frontend/index.html`'s `<style id="medconnect-motion">` block (plan 001).

## Steps

1. Read `frontend/src/pages/Stats.jsx` lines 84–112 to see both `Bars` and `VBars` in full.
2. Replace line 91 with the horizontal target above. Note that `width` becomes a constant
   `'100%'` and the value now drives `scaleX`; `minWidth:r.value?3:0` stays as the "something is
   there" floor for tiny values.
3. Evaluate `VBars` against the height-reference note in **Target**. Either apply the vertical
   target, or skip line 108 and report why.
4. Do not change the number formatting, the `max` calculation, the label column, or the
   `props.money` branch on line 93.

## Boundaries

- Do NOT touch any other file.
- Do NOT change the bar colours, dimensions, radii, or the chart markup structure.
- Do NOT add a chart library.
- Do NOT "improve" the four bar charts' data or ordering — this plan is motion only.
- If `Bars`/`VBars` have been restructured since this commit, STOP and report.

## Verification

- **Mechanical**: from `frontend/`, `npm run build` succeeds.
  `grep -n "transition:'width\|transition:'height" src/pages/Stats.jsx` returns **nothing**.
- **Feel check**: open the Stats page and change the date range so every chart re-animates:
  - Bars grow from the **left** edge (horizontal) and the **bottom** (vertical) — not from the
    centre outward. A bar that fans out from its middle means `transformOrigin` was missed.
  - Rounded corners must not look stretched or flattened while animating. If they distort, the
    bar is being scaled rather than sized and this plan's vertical half should be reverted.
  - Open DevTools → Performance, record while changing the range: the frames should show
    **no Layout entries** for the bars. Before the change they appear on every frame.
  - DevTools → Animations at 10% playback: only `transform` is listed for the bar elements.
- **Done when**: all four charts animate on `transform` at 250ms with the strong ease-out, corner
  radii hold their shape, and the Performance panel shows no per-frame layout for the bars.

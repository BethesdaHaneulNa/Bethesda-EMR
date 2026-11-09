# 004 — Honour prefers-reduced-motion

- **Status**: DONE (applied 2026-07-30)
- **Depends on**: 001 (adds the `<style id="medconnect-motion">` block this rule goes into)
- **Commit**: 75f3df3 (working tree also carries uncommitted v1.4.0 edits; line numbers below are from the working tree)
- **Severity**: MEDIUM
- **Category**: Accessibility (§6)
- **Estimated scope**: 1 file (`frontend/index.html`), ~12 lines added

## Problem

`prefers-reduced-motion` appears **zero times** in the repository. Every piece of movement in
the app runs unconditionally, including the one large positional animation:

```jsx
/* frontend/src/pages/Consultation.jsx:411 — current */
<div style={{position:'absolute',left:0,top:0,bottom:0,width:280,…,transform:queueOpen?'translateX(0)':'translateX(-290px)',transition:'transform 0.25s ease',…}}>
```

That is a **290px slide** of a full-height panel, triggered every time a clinician opens or
closes the patient queue — many times per session. For a user who has asked their operating
system to reduce motion (vestibular disorders, migraine, motion sensitivity), a panel sweeping
across a quarter of the screen is exactly what that setting exists to stop.

The Stats bars (`Stats.jsx:91`, `Stats.jsx:108`) and the press feedback introduced by plans 001
and 002 are also movement, and also currently ungated.

## Target

One media query appended inside the `<style id="medconnect-motion">` block created by plan 001.
Reduced motion means **fewer and gentler animations, not zero** — the opacity and colour feedback
that tells you a control responded stays; the movement goes:

```css
@media (prefers-reduced-motion: reduce) {
  /* Keep the brightness feedback on press/hover - it is what confirms the click landed -
     but drop the travel. */
  button:active:not(:disabled),
  .pressable:active { transform: none; }

  /* The queue drawer still needs to appear and disappear; it just must not sweep 290px
     across the screen. Cross-fade it in place instead. */
  [data-motion="drawer"] {
    transition: opacity 150ms var(--ease-out) !important;
    transform: none !important;
  }

  /* Bar charts: land on the final value without growing into it. */
  [data-motion="bar"] { transition: none !important; }
}
```

`!important` is used **only inside this media query**, and only on the two selectors that must
beat an inline style — inline `transform`/`transition` on those elements cannot be overridden any
other way, and the alternative is threading a `useReducedMotion()` hook through three components
for the same result. Outside this block, no `!important` anywhere (see plan 001's boundaries).

Two `data-motion` attributes must be added for the query to have something to target:

```jsx
/* frontend/src/pages/Consultation.jsx:411 — add the attribute, change nothing else */
<div data-motion="drawer" style={{position:'absolute',left:0,…}}>
```

```jsx
/* frontend/src/pages/Stats.jsx:91 and :108 — add the attribute, change nothing else */
<div data-motion="bar" style={{ … }}></div>
```

## Repo conventions to follow

- Global CSS belongs in `frontend/index.html`; motion rules belong in the
  `<style id="medconnect-motion">` block from plan 001. Append this query at the end of that
  block, after the `.pressable` rules.
- `data-*` attributes are the repo's only existing hook-without-restyling pattern — the app has
  no `className` usage before plan 002, and using data attributes here keeps the drawer and bar
  styling entirely inline as it is today.
- **Exemplar**: plan 001's `@media (hover: hover) and (pointer: fine)` block — same shape, same
  placement, same reasoning about capability queries.

## Steps

1. Confirm `frontend/index.html` contains `<style id="medconnect-motion">`. If not, apply plan
   001 first — this rule has nowhere to live and no `--ease-out` token to reference.
2. Append the `@media (prefers-reduced-motion: reduce)` block from **Target** at the end of that
   style block, before `</style>`.
3. In `frontend/src/pages/Consultation.jsx:411`, add `data-motion="drawer"` to the drawer div.
   Do not alter its style object, its `queueOpen` logic, or its `boxShadow`.
4. In `frontend/src/pages/Stats.jsx`, add `data-motion="bar"` to the bar fill divs at lines 91
   and 108. If plan 003 has already run, these lines will use `transform:'scaleX(…)'` — add the
   attribute to whatever the current markup is; the attribute is orthogonal to plan 003.
5. Change nothing else.

## Boundaries

- Do NOT add `!important` outside the media query.
- Do NOT remove or weaken any animation for users who have **not** asked for reduced motion.
- Do NOT introduce a `useReducedMotion()` hook, a matchMedia listener, or any JS — this is
  solvable in CSS and the JS version would need wiring through three components.
- Do NOT gate the print stylesheets (`frontend/src/pages/Payment.jsx:472`,
  `frontend/src/documents/shared.jsx:170`) — they contain no motion.
- Do NOT touch the toast, modals, or anything else that does not animate yet.

## Verification

- **Mechanical**: from `frontend/`, `npm run build` succeeds. `grep -c 'prefers-reduced-motion'
  index.html` returns **1**. `grep -rc 'data-motion' src` returns **3** (drawer + two bars).
- **Feel check**: DevTools → Rendering panel → *Emulate CSS prefers-reduced-motion: reduce*, then:
  - Consultation → toggle the patient queue: the drawer **fades** in place. It must not slide,
    and it must still fully appear and disappear — if it never shows at all, the `opacity`
    transition was dropped instead of the `transform`.
  - Press any button: it must **not** move, but the brightness change must still happen. No
    feedback at all is a failure of this plan, not a success.
  - Stats: change the date range — bars appear at their final length with no growth.
  - Turn the emulation **off** and re-check all three: full motion must return, unchanged from
    plans 001–003.
- **Done when**: with reduced motion on, nothing in the app translates or scales, every control
  still visibly confirms interaction, and turning the setting off restores the original motion
  exactly.

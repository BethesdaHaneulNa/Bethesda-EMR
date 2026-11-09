# 001 — Add global motion tokens and press feedback for every button

- **Status**: DONE (applied 2026-07-30)
- **Commit**: 75f3df3 (working tree also carries uncommitted v1.4.0 edits; line numbers below are from the working tree)
- **Severity**: HIGH
- **Category**: Physicality & origin (§3) + Performance/Accessibility root cause (§5, §6)
- **Estimated scope**: 1 file (`frontend/index.html`), ~25 lines added. No JS/JSX touched.

## Problem

Nothing in this app gives feedback when it is pressed. There are **140 `<button>` elements**
and **147 elements carrying `cursor:'pointer'`**, and not one of them changes appearance on
press. A click that did not register looks exactly like a click that did.

This is not decoration. Staff press 저장 / 수납 / 처방 buttons hundreds of times a day on a
clinical record; with no press feedback the natural reaction to an unsure click is to click
again, which is how duplicate records get created.

The root cause is structural: the entire UI is built from **React inline style objects**, and
inline styles cannot express `:active`, `:hover`, or `@media` queries. Five places work around
this by mutating the DOM by hand:

```jsx
// frontend/src/components/PatientFinder.jsx:101 — current (workaround)
onMouseEnter={function(e){e.currentTarget.style.background='…'}}
```

Same pattern at `PatientFinder.jsx:133`, `Consultation.jsx:581`, `Consultation.jsx:658`.
There is no `:active` equivalent to that trick, and no way to gate any of it on
`prefers-reduced-motion`.

There is no CSS file in the project. The only global CSS lives in two `<style>` blocks in
`frontend/index.html`.

## Target

A third named `<style>` block in `frontend/index.html`, following the existing
`<style id="medconnect-readable-ui">` precedent, holding motion tokens and a press rule that
reaches all 140 buttons through the `button` element selector — **no markup changes at all**:

```html
<style id="medconnect-motion">
  :root {
    /* Strong ease-out for UI. Built-in `ease` is too weak for deliberate motion. */
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
    --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
    --dur-press: 160ms;
    --dur-hover: 160ms;
    --dur-modal: 200ms;
  }

  /* Press feedback. transform + opacity only: both are composited, so this stays off the
     layout/paint path even on the busiest screen. */
  button {
    transition: transform var(--dur-press) var(--ease-out),
                filter var(--dur-hover) var(--ease-out);
  }
  button:active:not(:disabled) { transform: scale(0.97); }
  button:disabled { cursor: not-allowed; }

  /* Hover is gated: on a touch screen a tap fires a false hover that then sticks. */
  @media (hover: hover) and (pointer: fine) {
    button:not(:disabled):hover { filter: brightness(1.12); }
  }

  /* For the 42 `<div onClick>` pseudo-buttons — applied in plan 002, defined here so both
     kinds of button share one definition. */
  .pressable {
    transition: transform var(--dur-press) var(--ease-out),
                filter var(--dur-hover) var(--ease-out);
  }
  .pressable:active { transform: scale(0.97); }
  @media (hover: hover) and (pointer: fine) {
    .pressable:hover { filter: brightness(1.12); }
  }
</style>
```

Values are fixed, not suggestions: `scale(0.97)` and `160ms` come straight from the audit
playbook's press-feedback rule (subtle range 0.95–0.98, duration 100–160ms).

## Repo conventions to follow

- **All global CSS lives in `frontend/index.html`**, in named `<style>` blocks. There is no
  CSS file and none should be created — Vite serves this `index.html` directly and the
  Dockerfile builds from it unchanged.
- **Exemplar to imitate**: `frontend/index.html:11` — `<style id="medconnect-readable-ui">`
  is an existing second style block scoped to one concern (font sizing). The new block is the
  same idea for motion, and is placed immediately after it.
- Everything else in the app styles via inline objects; do not convert any component to
  classes in this plan.

## Steps

1. Open `frontend/index.html`. It currently reads:

   ```html
     <style id="medconnect-readable-ui">
       html, body, #root { min-height: 100%; }
       body { margin: 0; font-size: 18px; }
       input, select, textarea, button { font-size: 17px; }
       table { font-size: 16px; }
     </style>
   </head>
   ```

2. Insert the `<style id="medconnect-motion">` block from **Target** verbatim, directly after
   the closing `</style>` of `medconnect-readable-ui` and before `</head>`.

3. Change nothing else. Do not touch the two existing `<style>` blocks, and do not add
   `className` to any component — that is plan 002.

## Boundaries

- Do NOT create a `.css` file, and do NOT add a CSS framework or any dependency.
- Do NOT edit any `.jsx` file in this plan.
- Do NOT add `!important`. Inline styles already beat classes for the same property; the three
  elements that carry an inline `transform` (`DocumentModal.jsx:230`,
  `Consultation.jsx:411`, `Settings.jsx:768`) are **not** `<button>` elements, so the
  `button:active` rule cannot collide with them. Leave them alone.
- Do NOT add a `prefers-reduced-motion` block here — that is plan 004, which depends on the
  tokens this plan introduces.
- If `frontend/index.html` does not match the excerpt in step 1, STOP and report rather than
  improvising.

## Verification

- **Mechanical**: from `frontend/`, run `npm run build`. Expected: build succeeds; the emitted
  `dist/index.html` contains `medconnect-motion` and `cubic-bezier(0.23, 1, 0.32, 1)`.
- **Feel check**: run the app, open **Settings**, and press and hold the blue **저장 / Save**
  button in the edit modal, then the **+ Add** button:
  - The button visibly sinks while held and returns when released. The travel should read as
    a nudge, not a squash — if it looks like the button is shrinking, the value was mis-typed.
  - Release-and-press rapidly ten times: it must track every press, never restart from a
    half-finished state (CSS transitions retarget; this is the reason the rule is a transition
    and not `@keyframes`).
  - Open DevTools → Animations, set playback to 10%, press the button: confirm only
    `transform` is animating — no width, height, or layout property appears.
  - A disabled button (the modal's Save while a request is in flight) must not react.
- **Done when**: pressing any `<button>` anywhere in the app — Settings, Payment, Registration,
  Consultation, Pharmacy, Lab, Stats, Login — gives the same press response, with no component
  file modified.

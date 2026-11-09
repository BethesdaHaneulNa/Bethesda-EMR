# 002 — Give press feedback to the eight div-based buttons (and only those eight)

- **Status**: DONE (applied 2026-07-30)
- **Depends on**: 001 (defines the `.pressable` class this plan applies)
- **Commit**: 75f3df3 (working tree also carries uncommitted v1.4.0 edits; line numbers below are from the working tree)
- **Severity**: HIGH
- **Category**: Physicality & origin (§3), scoped by Purpose & frequency (§1)
- **Estimated scope**: 6 files, one `className` added per target — 8 lines changed total.

## Problem

Plan 001 reaches all 140 real `<button>` elements through the `button` element selector. It
cannot reach the **42 `<div onClick=…>` elements** that act as buttons, because they are not
`<button>` tags.

Of those 42, exactly **8 should get press feedback**. The other 34 must not, and giving them
feedback would be worse than leaving them alone:

- **Modal backdrops** (`DocumentModal.jsx:182`, `TopBar.jsx:108`, `Consultation.jsx:436`,
  `Consultation.jsx:681`, `Consultation.jsx:693`, `Consultation.jsx:719`, `Payment.jsx:461`)
  are full-screen `position:fixed; inset:0` divs whose `onClick` closes the dialog. A
  `scale(0.97)` on one of those scales the entire dimmed screen.
- **`stopPropagation` guards** (`DocumentModal.jsx:183`, `TopBar.jsx:109`,
  `Consultation.jsx:682`, `Consultation.jsx:694`, `Consultation.jsx:720`, `Payment.jsx:400`,
  `Payment.jsx:462`, `Registration.jsx:403`) are not buttons at all — they carry an `onClick`
  only to stop the backdrop click from firing. Nothing there is pressable.
- **Layout wrappers that merely contain buttons** (`Payment.jsx:393`, `Payment.jsx:564`,
  `Settings.jsx:633`, `Stats.jsx:79`).
- **High-frequency list rows** (`Consultation.jsx:425`, `:472`, `:580`, `:604`, `:657`,
  `Lab.jsx:135`, `Payment.jsx:319`, `Pharmacy.jsx:154`, `Registration.jsx:276`, `:396`,
  `DocumentModal.jsx:242`, `PatientChart.jsx:79`, `Settings.jsx:457`) — the patient queue, the
  drug search results, the visit lists. Reception and consultation staff click these
  continuously all day. The audit rule for that frequency band is *remove or drastically
  reduce* motion, not add it. A row that scales and then swaps the whole panel is noise, and
  several of these rows are also keyboard-navigated (`Consultation.jsx:472` moves the
  selection on `onMouseEnter`), where a press animation has nothing to respond to.

## Target

`className="pressable"` on these eight, and nowhere else:

| File:line | What it is |
| --- | --- |
| `frontend/src/pages/Stats.jsx:78` | clickable stat card (미수 / 환불 예정 toggle the list below) |
| `frontend/src/pages/Settings.jsx:241` | tab strip (Staff / Drugs / Departments / …) |
| `frontend/src/pages/Settings.jsx:490` | PACS auto-create-worklist toggle |
| `frontend/src/pages/Settings.jsx:725` | worklist_enabled toggle in the edit modal |
| `frontend/src/pages/Registration.jsx:300` | gender segmented control |
| `frontend/src/pages/Consultation.jsx:619` | order-set group accordion header |
| `frontend/src/pages/Consultation.jsx:627` | apply-order-set tile |
| `frontend/src/components/DocumentModal.jsx:206` | chart-template picker row |

`Stats.jsx:78` is a shared `Card` component rendered both with and without `onClick`, so the
class must be conditional — a non-clickable card must not react to a press:

```jsx
/* frontend/src/pages/Stats.jsx:78 — current */
function Card(props){ return <div onClick={props.onClick} style={{ background:scBg, … }}>

/* target */
function Card(props){ return <div onClick={props.onClick} className={props.onClick?'pressable':undefined} style={{ background:scBg, … }}>
```

The other seven take the class unconditionally:

```jsx
/* frontend/src/pages/Settings.jsx:241 — current */
return <div key={tab.key} onClick={function(){setTab(tab.key);setQ('')}} style={{padding:'8px 14px',cursor:'pointer',…}}

/* target */
return <div key={tab.key} className="pressable" onClick={function(){setTab(tab.key);setQ('')}} style={{padding:'8px 14px',cursor:'pointer',…}}
```

## Repo conventions to follow

- Components style exclusively through inline objects and carry **no `className` today**. This
  plan introduces the first ones deliberately, because `:active` cannot be expressed inline —
  it does not open the door to migrating anything else to classes.
- `.pressable` is defined once in `frontend/index.html` by plan 001. Do not redefine it, and do
  not add a second variant.
- **Exemplar**: plan 001's `button:active:not(:disabled) { transform: scale(0.97); }` — the
  `.pressable` rules mirror it exactly, so both kinds of button feel identical.

## Steps

1. Confirm plan 001 has been applied: `frontend/index.html` must contain
   `<style id="medconnect-motion">` and a `.pressable:active` rule. If it does not, STOP —
   this plan does nothing without it.
2. For each of the seven unconditional targets in the table above, add `className="pressable"`
   immediately before the existing `onClick` attribute. Change nothing else on the line — not
   the style object, not the handler, not the `key`.
3. For `frontend/src/pages/Stats.jsx:78`, add the conditional form shown in **Target**.
4. Before saving each file, confirm the element you edited has **no `transform` in its inline
   style object**. An inline `transform` would beat the class and silently do nothing. None of
   the eight has one at this commit; if one does now, STOP and report.

## Boundaries

- Do NOT add `className` to any element not in the table — especially not to the 34 listed
  under **Problem**.
- Do NOT convert inline styles to classes, and do NOT create a CSS file.
- Do NOT touch `frontend/index.html` (that is plan 001) or `Stats.jsx`'s `Bars`/`VBars`
  components (that is plan 003).
- Do NOT add hover background changes to list rows in this plan, even though several rows lack
  them. That is a separate concern with its own frequency argument.
- If a line does not match the excerpt shown, STOP and report rather than guessing which
  element was meant.

## Verification

- **Mechanical**: from `frontend/`, `npm run build` succeeds. `grep -rc 'pressable' src` returns
  **8** matches across the 6 files listed (Stats.jsx counts once).
- **Feel check**: run the app and press each of the eight:
  - Settings tab strip: the tab sinks on press and the panel switches. The tab must not keep
    sinking while you drag off it and release elsewhere.
  - Stats page: the 미수 card reacts; the 수납액 card (no `onClick`) must **not** react at all.
  - Open any modal (Settings edit, DocumentModal): click the **dimmed backdrop** — the screen
    must close without the overlay scaling. If the whole screen twitches, the class went onto a
    backdrop; remove it.
  - Consultation patient queue: click a patient row — it must **not** scale. Only the panel
    content changes.
- **Done when**: the eight react identically to a real `<button>`, the queue and search-result
  rows are visually unchanged from before, and no backdrop animates.

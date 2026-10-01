// Theme helpers (design session - wiki/modules/design.md 3.3).
//
// The colour values live in index.html (<style id="bethesda-theme">): :root is the dark
// screen, :root[data-theme="light"] the light one, :root[data-theme="paper"] the warm
// paper one (added 2026-10-01). The screens are styled with inline
// objects, so a colour is written as the name of its token:
//
//   cv('panel')           -> 'var(--panel)'
//   tint('accent', '18')  -> 'var(--accent-a18)'     was '#3b82f6' + '18'
//
// tint() exists because text cannot be appended to var(...), and color-mix() would do it
// but needs Chrome 111: the clinic's oldest PCs stop at Chrome 109, where an unknown
// function drops the whole declaration and the colour with it. Every tint a screen uses
// is therefore a token of its own, defined in index.html.

export function cv(name) { return 'var(--' + name + ')'; }

export function tint(name, alpha) { return 'var(--' + name + '-a' + alpha + ')'; }

var KEY = 'medconnect_theme';

// The screens there are. Anything else - a value from an older or newer version, a
// blocked storage - is the dark screen, which is what every account starts with.
export var THEMES = ['dark', 'light', 'paper'];

export function isTheme(v) { return THEMES.indexOf(v) >= 0; }

export function getTheme() {
  var t = document.documentElement.getAttribute('data-theme');
  return isTheme(t) ? t : 'dark';
}

// Changes the screen at once. localStorage keeps this PC's last choice for the login
// screen and the first paint (index.html reads it); it can be blocked, and that must not
// stop the screen from changing.
export function setTheme(theme) {
  var t = isTheme(theme) ? theme : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem(KEY, t); } catch (e) { /* storage blocked: the choice lasts until reload */ }
  return t;
}

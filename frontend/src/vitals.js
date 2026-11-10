// Vital signs typed at reception or on a phone (clinic manager, on site, 2026-11-09).
//
// What the reception window (components/VitalsModal.jsx) and the phone page
// (pages/MobileVitals.jsx) share: the eight fields in the order they are taken, the
// form <-> API conversion, the server's refusals in the screen's language, and the rule
// that sends a phone to /m. The API is GET / PUT /api/visits/:id/vitals
// (backend/src/routes/consult.routes.js, "Vital signs typed at reception").

// [API field, i18n key of the label, i18n key of the unit]. The order is the order on
// paper: blood pressure first, weight and height last. The units go through i18n too
// (clinic manager, 1.7.9: every string of /m in the chosen language).
export var VITALS = [
  ['bp_systolic', 'vs_bpSys', 'vs_uMmHg'],
  ['bp_diastolic', 'vs_bpDia', 'vs_uMmHg'],
  ['temperature', 'vs_temp', 'vs_uC'],
  ['pulse', 'vs_pulse', 'vs_uMin'],
  ['spo2', 'vs_spo2', 'vs_uPct'],
  ['respiratory_rate', 'vs_rr', 'vs_uMin'],
  ['weight', 'vs_weight', 'vs_uKg'],
  ['height', 'vs_height', 'vs_uCm'],
];

// The API answer -> the boxes (text). The decimal columns come back as text ("158.0");
// the box shows the number as typed (158).
export function vitalsForm(d) {
  var f = {};
  VITALS.forEach(function (v) {
    var x = d ? d[v[0]] : null;
    f[v[0]] = x == null ? '' : (isFinite(Number(x)) ? String(Number(x)) : String(x));
  });
  return f;
}

// The boxes -> the PUT body: all eight, an empty box is null (it empties the field).
// The server accepts "36,5" as a French phone keyboard types it.
export function vitalsBody(form) {
  var b = {};
  VITALS.forEach(function (v) { var x = String(form[v[0]] == null ? '' : form[v[0]]).trim(); b[v[0]] = x === '' ? null : x; });
  return b;
}

export function fill(s, vars) {
  return String(s || '').replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : ''; });
}

export function hhmm(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// "be between 25 and 45" / "be a number" (the server's words after "<field> must") in the
// screen's language; anything else is shown as it came.
function vitalsReason(t, reason) {
  var r = /^be between (-?[0-9.]+) and (-?[0-9.]+)$/.exec(reason);
  if (r && t.vs_reasonRange) return fill(t.vs_reasonRange, { min: r[1], max: r[2] });
  if (/^be a (whole )?number$/.test(reason) && t.vs_reasonNumber) return t.vs_reasonNumber;
  return reason;
}

// The server's English refusal -> the screen's words. "temperature must be between 25 and
// 45" names the field: the label is put in front of the reason.
export function vitalsError(t, err) {
  var msg = (err && err.message) || '';
  if (err && err.status === 404) return t.vs_notFound;
  if (err && err.status === 403) return t.vs_denied;
  var m = /^(\w+) must (.*)$/.exec(msg);
  if (m) {
    var row = VITALS.filter(function (v) { return v[0] === m[1]; })[0];
    // The reason too is said in the screen's language: it read "Température : valeur
    // refusée (be between 25 and 45)" on a French phone (bug hunt round 10).
    if (row) return fill(t.vs_badValue, { field: t[row[1]], msg: vitalsReason(t, m[2]) });
  }
  return fill(t.vs_error, { msg: msg });
}

// ── A phone goes to /m (clinic manager, 2026-11-09) ──
// A phone opening the EMR's address, or signing in, lands on the vital-signs page instead
// of the reception screen: a narrow screen or a mobile browser. "Version ordinateur" on /m
// sets FORCE_PC_KEY so the phone then stays on the ordinary screens; signing out clears it
// (api/client.js logout). Every account goes there: any member of staff may type vital
// signs (clinic manager, 2026-11-09), and the link at the bottom of /m leads to the usual screens.
export var FORCE_PC_KEY = 'bethesda_force_pc';

export function isPhone() {
  try {
    if (window.matchMedia && window.matchMedia('(max-width: 700px)').matches) return true;
  } catch (e) { /* no matchMedia */ }
  return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
}

export function phoneHome(user) {
  var forced = false;
  try { forced = localStorage.getItem(FORCE_PC_KEY) === '1'; } catch (e) { /* storage blocked */ }
  return !forced && user && isPhone() ? '/m' : null;
}

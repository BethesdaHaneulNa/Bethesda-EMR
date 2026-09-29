// Document template registry.
// To add a new document (진단서, 소견서, 통원확인서 ...): create a template file
// like ./referral.jsx and add it to TEMPLATES below. Nothing else needs to change.
import referral from './referral.jsx';
import externalRx from './external-rx.jsx';
import { CHART_TEMPLATES } from './surgical-records.jsx';

export var TEMPLATES = [referral, externalRx].concat(CHART_TEMPLATES);

export function getTemplate(code) {
  for (var i = 0; i < TEMPLATES.length; i++) {
    if (TEMPLATES[i].code === code) return TEMPLATES[i];
  }
  return null;
}

// templates filtered by category ('document' | 'prescription').
// Lets the generic document button and the dedicated outside-prescription
// button each show (and log) only their own kind.
export function templatesByCategory(cat) {
  cat = cat || 'document';
  return TEMPLATES.filter(function (t) { return (t.category || 'document') === cat; });
}

// One medication line for a letter, e.g. "Paracetamol — 3/j (1 × 3) × 7 j". `dose` is
// the DAILY total (the clinic prescribes the Korean way, see consult.routes.js rxTotal),
// so the old "3.000 x3 x7d" read as three tablets three times a day - three times the
// real amount. The dose per intake is shown only when it comes out in half tablets,
// the same rule the consultation and pharmacy screens use.
var MED_FMT = {
  ko: { even: '하루 {daily} (1회 {per} × {freq}회) × {days}일', uneven: '하루 {daily} ({freq}회로 나눔) × {days}일' },
  en: { even: '{daily}/day ({per} × {freq}) × {days} days',     uneven: '{daily}/day in {freq} doses × {days} days' },
  fr: { even: '{daily}/j ({per} × {freq}) × {days} j',          uneven: '{daily}/j en {freq} prises × {days} j' },
};
function r3(n) { return String(Math.round(n * 1000) / 1000); }

// resolve autofill value for a field from consultation context
export function autofillValue(src, ctx, lang) {
  ctx = ctx || {};
  if (src === 'doctor') return ctx.doctor_name || '';
  if (src === 'note') return ctx.note || '';
  if (src === 'meds') {
    var meds = ctx.meds || [];
    var fmt = MED_FMT[lang] || MED_FMT.en;
    return meds.map(function (m) {
      var name = m.drug_name || m.order_name || m.name || '';
      var daily = parseFloat(m.dose);
      if (!isFinite(daily) || !m.days) return ('· ' + name).trim();
      var freq = parseInt(m.frequency) || 1, per = daily / freq;
      var even = Math.abs(per * 2 - Math.round(per * 2)) < 1e-9;
      var line = (even ? fmt.even : fmt.uneven).replace('{daily}', r3(daily)).replace('{per}', r3(per))
        .replace('{freq}', freq).replace('{days}', parseInt(m.days) || 1);
      return '· ' + name + ' — ' + line;
    }).filter(Boolean).join('\n');
  }
  return '';
}

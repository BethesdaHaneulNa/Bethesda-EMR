// Document template registry.
// To add a new document (진단서, 소견서, 통원확인서 ...): create a template file
// like ./referral.jsx and add it to TEMPLATES below. Nothing else needs to change.
import referral from './referral.jsx';
import { doseSentence, isLegacyTotal } from './rx-dosing.js';
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

// Medication lines for a letter use the pharmacy's wording (rx-dosing.js doseSentence),
// so the referral, the outside prescription and the screens read the same:
// "Paracetamol 500mg Tab — 1 tab × 3 times/day for 7 days (total 21)". A total saved
// before the daily-total formula (2026-09-29) would contradict its own sentence, so it
// is marked as the old calculation rather than silently printed.
var LEGACY = { ko: '(예전 계산)', en: '(old calculation)', fr: '(ancien calcul)' };

// resolve autofill value for a field from consultation context
export function autofillValue(src, ctx, lang) {
  ctx = ctx || {};
  if (src === 'doctor') return ctx.doctor_name || '';
  if (src === 'note') return ctx.note || '';
  if (src === 'meds') {
    var meds = ctx.meds || [];
    return meds.map(function (m) {
      var name = m.drug_name || m.order_name || m.name || '';
      var sentence = doseSentence(m, lang);
      if (!sentence) return ('· ' + name).trim();
      return '· ' + name + ' — ' + sentence + (isLegacyTotal(m) ? ' ' + (LEGACY[lang] || LEGACY.en) : '');
    }).filter(Boolean).join('\n');
  }
  return '';
}

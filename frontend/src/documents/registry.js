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

// resolve autofill value for a field from consultation context
export function autofillValue(src, ctx) {
  ctx = ctx || {};
  if (src === 'doctor') return ctx.doctor_name || '';
  if (src === 'note') return ctx.note || '';
  if (src === 'meds') {
    var meds = ctx.meds || [];
    return meds.map(function (m) {
      var name = m.drug_name || m.order_name || m.name || '';
      var d = m.dose ? ' ' + m.dose : '';
      var f = m.frequency ? ' x' + m.frequency : '';
      var days = m.days ? ' x' + m.days + 'd' : '';
      return ('· ' + name + d + f + days).trim();
    }).filter(Boolean).join('\n');
  }
  return '';
}

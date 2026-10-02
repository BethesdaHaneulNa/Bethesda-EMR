// Document template registry.
// To add a new document (진단서, 소견서, 통원확인서 ...): create a template file
// like ./referral.jsx and add it to TEMPLATES below. Nothing else needs to change.
import referral from './referral.jsx';
import { doseSentence, isLegacyTotal } from './rx-dosing.js';
import externalRx from './external-rx.jsx';
import { CHART_TEMPLATES } from './surgical-records.jsx';
import imagingReport from './imaging-report.jsx';
import labResults from './lab-results.jsx';
import imagingImages from './imaging-images.jsx';

// imagingReport (category 'imaging') is issued from the imaging list, where the exam and
// its reading are chosen - not from a documents window, so no window offers it under
// "new" (templatesByCategory never returns it). It is registered so that a sheet
// already issued can be drawn again from its saved payload, named in the history and in
// the change log, reprinted and voided like any other paper.
// labResults (category 'lab') is the same kind of paper, issued from the lab results window.
// imagingImages (category 'imaging'): an exam's pictures on paper, issued from the imaging
// list (components/ImagesPrint.jsx). Its record names the pictures; drawn again, the sheet
// asks the image server for them.
export var TEMPLATES = [referral, externalRx].concat(CHART_TEMPLATES).concat([imagingReport, labResults, imagingImages]);

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

// The documents a window lists in its history: its own kinds, and the kinds issued on
// another screen that belong with them. The imaging report goes with the letters and
// certificates (the 📄 Documents window of consultation and payment): it leaves the
// clinic with the patient like a referral letter.
var HISTORY_ALSO = { document: ['imaging-report', 'lab-results', 'imaging-images'] };
export function historyCodes(cat) {
  cat = cat || 'document';
  return templatesByCategory(cat).map(function (t) { return t.code; }).concat(HISTORY_ALSO[cat] || []);
}

// The title of the print window - what the browser prints in the page header when its
// "headers and footers" are on, and the file name when the page is saved as PDF. A paper
// carries its number there, as it does in its own text; the imaging report does not show
// its number on the sheet at all (director, 2026-10-01: it goes to another hospital), so
// it is titled by its name, as when it is first printed from the imaging list.
var NO_NUMBER_ON_PAPER = ['imaging-report', 'lab-results', 'imaging-images'];   // the lab results sheet follows the imaging report
export function printTitle(doc, lang) {
  if (!doc) return 'document';
  var tpl = getTemplate(doc.template_code);
  if (tpl && NO_NUMBER_ON_PAPER.indexOf(tpl.code) >= 0) return (tpl.name && (tpl.name[lang] || tpl.name.fr)) || doc.template_name || 'document';
  return doc.doc_no || 'document';
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
  // The consultation's diagnoses, one a line, the primary first: "B54 Paludisme, sans
  // précision". A diagnosis picked from the clinic's list reads in the document's
  // language; one typed freely reads as it was typed.
  if (src === 'diagnoses') {
    return (ctx.diagnoses || []).map(function (d) {
      var name = d['name_' + lang] || (d.diagnosis_code_id ? d.name_en : '') || d.diagnosis_name || '';
      return [d.icd_code, name].filter(Boolean).join(' ');
    }).filter(Boolean).join('\n');
  }
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

// Document template registry.
// To add a new document (진단서, 소견서, 통원확인서 ...): create a template file
// like ./referral.jsx and add it to TEMPLATES below. Nothing else needs to change.
import referral from './referral.jsx';
import medicalCertificate from './medical-certificate.jsx';
import { doseSentence, isLegacyTotal } from './rx-dosing.js';
import externalRx from './external-rx.jsx';
import { CHART_TEMPLATES } from './surgical-records.jsx';
import imagingReport from './imaging-report.jsx';
import labResults from './lab-results.jsx';
import imagingImages from './imaging-images.jsx';

// Issued or only printed (director, 2026-10-02). The documents a doctor writes and gives
// out are ISSUED: they take a number and stay in the patient's document history - the
// referral letter, the medical certificate, the outside prescription, the chart records.
// A RESULT SHEET is a result that already exists, put on paper: the imaging report
// (imagingReport), the lab results (labResults), an exam's pictures (imagingImages). It
// is printed from its own window (the imaging list, the lab results window), takes no
// number and makes no document row - only a change-log line (POST /documents/print-log;
// the pictures: POST /pacs/export/printed).
// Those three are still listed below for ONE reason: until 2026-10-02 they were issued,
// and the change log holds "documents.issue" lines that name them - the log tab asks this
// registry for a paper's name. No window offers them under "new" (their category is not a
// window's) and none lists them in its history any more; the rows issued before the
// change stay in the database, unlisted.
export var TEMPLATES = [referral, medicalCertificate, externalRx].concat(CHART_TEMPLATES).concat([imagingReport, labResults, imagingImages]);

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

// The documents a window lists in its history: the kinds it can issue. (The imaging
// report, the lab results and the image prints were listed in the 📄 Documents window
// until 2026-10-02; they are printed, not issued, and are no longer listed.)
export function historyCodes(cat) {
  cat = cat || 'document';
  return templatesByCategory(cat).map(function (t) { return t.code; });
}

// The title of the print window - what the browser prints in the page header when its
// "headers and footers" are on, and the file name when the page is saved as PDF: the
// paper's number, as in its own text.
export function printTitle(doc, lang) {
  if (!doc) return 'document';
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

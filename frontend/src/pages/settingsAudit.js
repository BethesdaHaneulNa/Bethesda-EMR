// How the Settings "Log" tab reads a change-log line (audit_log, wiki/03-change-log.md).
//
// Each module writes its own lines with writeAudit() and chooses the field names in
// before/after. This file turns them into words: the action into a sentence, each
// field into its label, a few values (roles, permissions, status, department) into
// what the screen calls them. A field or action not listed here is shown as it is
// stored - still readable, just not translated - so a module can start logging before
// its labels are added. Add a line here (and the se_ key in ko/en/fr) when a module
// logs a new field.
import { MODULES } from '../modules.js';
import { seMoney } from './settingsMoney.js';

// Fields that hold an amount in ariary: shown grouped, without ".00" (settingsMoney.js).
// Quantities, days and numbers of receipts are not amounts and stay as stored.
var MONEY = { unit_price: 1, price: 1, price_clinic: 1, total_due: 1, amount_paid: 1, refunded_amount: 1, outstanding: 1, refund: 1 };

// action -> se_ key of the sentence
export var AUDIT_ACTIONS = {
  'laboratory.result.edit': 'se_act_labResultEdit',
  'consultation.record.edit': 'se_act_consultEdit',
  'consultation.prescription.delete': 'se_act_rxDelete',
  'consultation.order.delete': 'se_act_orderDelete',
  'consultation.order.cancel': 'se_act_orderCancel',
  'payment.receipt.cancel': 'se_act_receiptCancel',
  'payment.receipt.correct': 'se_act_receiptCorrect',
  'reception.patient.edit': 'se_act_patientEdit',
  // a visit moved to another department or doctor (reception, visit.routes.js applyTransfer)
  'visit.transfer': 'se_act_visitTransfer',
  'settings.staff.create': 'se_act_staffCreate',
  'settings.staff.edit': 'se_act_staffEdit',
  'settings.staff.permissions': 'se_act_staffPerms',
  'settings.staff.password': 'se_act_staffPassword',
  // price only, before -> after (decision 2026-09-30 (나)); no patient
  'settings.drug.price': 'se_act_drugPrice',
  'settings.order.price': 'se_act_orderPrice',
  // a phrase category made, renamed or removed (name, status, phrases moved)
  'settings.phrase.category': 'se_act_phraseCategory',
  // documents (decision 2026-09-30 (다)): issued and voided; the document's content never comes here
  'documents.issue': 'se_act_docIssue',
  'documents.void': 'se_act_docVoid',
};

// field name -> se_ key of its label
var FIELDS = {
  // settings: staff accounts
  login_id: 'se_fLoginId', name: 'se_fName', role: 'se_colRole',
  department_id: 'se_colDept', phone: 'se_fPhone', email: 'se_fEmail', permissions: 'se_fld_permissions',
  // laboratory: results
  value: 'se_fld_value', flag: 'se_fld_flag', unit: 'se_fld_unit',
  // reception: patient details
  last_name: 'se_fld_lastName', first_name: 'se_fld_firstName', date_of_birth: 'se_fld_dob', gender: 'se_fld_gender',
  mobile: 'se_fld_mobile', address: 'se_fAddress', city: 'se_fld_city', region: 'se_fld_region',
  national_id: 'se_fld_nationalId', blood_type: 'se_fld_bloodType', allergies: 'se_fld_allergies',
  reception_note: 'se_fld_receptionNote',
  // payment: receipts
  payment_status: 'se_fld_paymentStatus', outstanding: 'se_fld_outstanding',
  balance_restored_to: 'se_fld_balanceRestoredTo', receipts: 'se_fld_receipts', total_due: 'se_fld_totalDue',
  amount_paid: 'se_fld_amountPaid', refund: 'se_fld_refund', refunded_amount: 'se_fld_refundedAmount', items: 'se_fld_items',
  // consultation (d7cee75): note and vital signs of a finished consultation
  subjective: 'se_fld_subjective', objective: 'se_fld_objective', assessment: 'se_fld_assessment', plan: 'se_fld_plan',
  note_text: 'se_fld_noteText', bp_systolic: 'se_fld_bpSys', bp_diastolic: 'se_fld_bpDia', temperature: 'se_fld_temperature',
  pulse: 'se_fld_pulse', spo2: 'se_fld_spo2', respiratory_rate: 'se_fld_respRate', weight: 'se_fld_weight', height: 'se_fld_height',
  // consultation: prescriptions and orders
  drug_code: 'se_fld_drugCode', drug_name: 'se_fld_drugName',
  order_code: 'se_fld_orderCode', order_name: 'se_fld_orderName', code_type: 'se_fld_codeType',
  dose: 'se_fld_dose', frequency: 'se_fld_frequency', days: 'se_fld_days', route: 'se_fld_route',
  quantity: 'se_fld_quantity', total_qty: 'se_fld_totalQty', unit_price: 'se_fld_unitPrice', memo: 'se_fld_memo',
  // settings: an order code's price (price_clinic is the one the payment screen bills)
  price_clinic: 'se_fld_priceClinic', price: 'se_fld_priceList',
  // documents (document.routes.js): number, which document, its language; voiding
  doc_no: 'se_fld_docNo', template_code: 'se_fld_template', lang: 'se_fld_docLang',
  voided: 'se_fld_voided', void_reason: 'se_fld_voidReason',
  // a visit's transfer: department_id (above, shown as the department) and the doctor by
  // name - the line keeps the name as it was, none is "—" - and the reason as typed
  doctor: 'se_fld_doctor', reason: 'se_fld_reason',
  // a removed phrase category: where its phrases went
  phrases_moved_to: 'se_fld_phrasesMovedTo', phrases_moved: 'se_fld_phrasesMoved',
  pack_label: 'se_fld_packLabel',
  // consultation: diagnoses
  icd_code: 'se_fld_icdCode', diagnosis_name: 'se_fld_diagnosisName', diagnosis_type: 'se_fld_diagnosisType',
  // Shared, and last in a line: a staff account's, order's or prescription's status,
  // and why an order or receipt was cancelled.
  status: 'se_colStatus', cancel_reason: 'se_fld_cancelReason',
};
// The Log tab lists a line's fields in the order of FIELDS above (auditChanges).

// consultation.record.edit covers five kinds of row; the entity says which, and is
// shown after the sentence ("Finished consultation record edited - prescription").
// consultation_note (038): the note is one row per doctor; its field is note_text.
var ENTITIES = {
  consultation: 'se_ent_consultation', consultation_note: 'se_ent_consultation_note', diagnosis: 'se_ent_diagnosis',
  prescription: 'se_ent_prescription', order_item: 'se_ent_order_item',
};
export function auditEntityText(t, row) {
  if (row.action !== 'consultation.record.edit') return '';
  var k = ENTITIES[row.entity];
  return (k && t[k]) || row.entity || '';
}
// The summary the line was written with, unless the entity already says it
// (consultation notes - the old column and, since 038, a doctor's own row - are logged
// with the summary 'note'). A patient edit's summary
// is the list of changed field names ("gender, mobile"), shown as their labels.
export function auditSummary(t, row) {
  if ((row.entity === 'consultation' || row.entity === 'consultation_note') && row.summary === 'note') return '';
  if (row.action === 'reception.patient.edit' && row.summary) {
    return row.summary.split(/,\s*/).map(function (f) { return auditFieldLabel(t, f); }).join(', ');
  }
  return row.summary || '';
}

export function auditActionText(t, action) {
  var k = AUDIT_ACTIONS[action];
  return (k && t[k]) || action;
}

export function auditFieldLabel(t, field) {
  var k = FIELDS[field];
  return (k && t[k]) || field;
}

// ctx: { depts: [{id, code, name}] } for department ids, entity: the line's entity
// (a prescription's 'ordered' is "prescribed", an order's is "ordered").
var LANG_NAMES = { ko: '한국어', en: 'English', fr: 'Français' };
var STATUS_KEYS = { ordered: 'se_st_ordered', dispensed: 'se_st_dispensed', cancelled: 'se_st_cancelled',
  scheduled: 'se_st_scheduled', in_progress: 'se_st_in_progress', completed: 'se_st_completed' };
export function auditValue(t, field, v, ctx) {
  if (v === null || v === undefined || v === '') return '—';
  if (MONEY[field] && !Array.isArray(v) && typeof v !== 'object' && isFinite(Number(v))) return seMoney(v, ctx && ctx.lang);
  if (field === 'permissions' && Array.isArray(v)) {
    if (!v.length) return '—';
    return v.map(function (p) { var m = MODULES.filter(function (x) { return x.perm === p; })[0]; return m ? (t[m.key] || p) : p; }).join(', ');
  }
  if (field === 'role') return t['se_role_' + v] || v;
  if (field === 'status' && (v === 'active' || v === 'inactive')) return v === 'active' ? t.se_statusActive : t.se_statusInactive;
  if (field === 'status' && v === 'ordered' && ctx && ctx.entity === 'prescription') return t.se_st_rxOrdered || v;
  if (field === 'status' && STATUS_KEYS[v]) return t[STATUS_KEYS[v]] || v;
  if (field === 'code_type') return t['se_type_' + v] || v;
  // lab result judgement (utils/labFlag.js): low / normal / high / abnormal
  if (field === 'flag') return t['se_flag_' + v] || v;
  // pack-unit word copied onto a prescription (025): bottle / tube / inhaler / unit
  if (field === 'pack_label') return t['ph_pack_' + v] || v;
  if (field === 'diagnosis_type') return t['se_dx_' + v] || v;
  if (field === 'gender') return t['se_gender_' + v] || v;
  // a document's template code as the document engine names it (ctx.templateName, given
  // by Settings.jsx from documents/registry.js); the code itself when it is unknown
  if (field === 'template_code') return (ctx && ctx.templateName && ctx.templateName(v)) || v;
  // the language a document was printed in, in its own name
  if (field === 'lang' && LANG_NAMES[v]) return LANG_NAMES[v];
  if (field === 'voided' && typeof v === 'boolean') return v ? (t.se_yes || '✓') : (t.se_no || '✗');
  // A receipt's status in the payment screen's words (py_st*): paid / partial / unpaid /
  // cancelled / waived. A correction line lists one per receipt (an array, payment B4
  // ada48fa), next to receipts in the same order.
  if (field === 'payment_status') {
    var st = function (x) { var k = 'py_st' + String(x).charAt(0).toUpperCase() + String(x).slice(1); return t[k] || String(x); };
    return Array.isArray(v) ? (v.length ? v.map(st).join(', ') : '—') : st(v);
  }
  if (field === 'department_id' && ctx && ctx.depts) {
    var d = ctx.depts.filter(function (x) { return String(x.id) === String(v); })[0];
    if (d) return d.code + ' - ' + d.name;
  }
  if (Array.isArray(v)) return v.map(function (x) { return typeof x === 'object' ? JSON.stringify(x) : String(x); }).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? '✓' : '✗';
  return String(v);
}

// The changed fields of a line, in a stable order: [{ field, label, before, after, kind }]
// kind: 'change' (both sides), 'add' (created: no before), 'remove' (deleted: no after)
export function auditChanges(t, row, ctx) {
  var b = row.before_value, a = row.after_value;
  ctx = Object.assign({}, ctx, { entity: row.entity });
  var keys = [];
  [b, a].forEach(function (o) { if (o) Object.keys(o).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); });
  // A created or deleted row lists only the fields it had; "Days: — (deleted)" says nothing.
  if (!(b && a)) keys = keys.filter(function (k) { var v = (a || b)[k]; return !(v === null || v === undefined || v === ''); });
  // The order of FIELDS (name before dose before price), not the order the database kept.
  var order = Object.keys(FIELDS);
  keys.sort(function (x, y) {
    var i = order.indexOf(x), j = order.indexOf(y);
    return (i < 0 ? 1e6 : i) - (j < 0 ? 1e6 : j);
  });
  return keys.map(function (k) {
    return {
      field: k, label: auditFieldLabel(t, k),
      before: b ? auditValue(t, k, b[k], ctx) : null,
      after: a ? auditValue(t, k, a[k], ctx) : null,
      kind: b && a ? 'change' : (a ? 'add' : 'remove'),
    };
  });
}

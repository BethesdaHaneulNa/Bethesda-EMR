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
  'settings.staff.create': 'se_act_staffCreate',
  'settings.staff.edit': 'se_act_staffEdit',
  'settings.staff.permissions': 'se_act_staffPerms',
  'settings.staff.password': 'se_act_staffPassword',
};

// field name -> se_ key of its label
var FIELDS = {
  // settings: staff accounts
  login_id: 'se_fLoginId', name: 'se_fName', role: 'se_colRole', status: 'se_colStatus',
  department_id: 'se_colDept', phone: 'se_fPhone', email: 'se_fEmail', permissions: 'se_fld_permissions',
  // laboratory: results
  value: 'se_fld_value', flag: 'se_fld_flag', unit: 'se_fld_unit',
  // reception: patient details
  last_name: 'se_fld_lastName', first_name: 'se_fld_firstName', date_of_birth: 'se_fld_dob', gender: 'se_fld_gender',
  mobile: 'se_fld_mobile', address: 'se_fAddress', city: 'se_fld_city', region: 'se_fld_region',
  national_id: 'se_fld_nationalId', blood_type: 'se_fld_bloodType', allergies: 'se_fld_allergies',
  reception_note: 'se_fld_receptionNote',
  // payment: receipts
  payment_status: 'se_fld_paymentStatus', outstanding: 'se_fld_outstanding', cancel_reason: 'se_fld_cancelReason',
  balance_restored_to: 'se_fld_balanceRestoredTo', receipts: 'se_fld_receipts', total_due: 'se_fld_totalDue',
  amount_paid: 'se_fld_amountPaid', refund: 'se_fld_refund', items: 'se_fld_items',
};

export function auditActionText(t, action) {
  var k = AUDIT_ACTIONS[action];
  return (k && t[k]) || action;
}

export function auditFieldLabel(t, field) {
  var k = FIELDS[field];
  return (k && t[k]) || field;
}

// ctx: { depts: [{id, code, name}] } for department ids
export function auditValue(t, field, v, ctx) {
  if (v === null || v === undefined || v === '') return '—';
  if (field === 'permissions' && Array.isArray(v)) {
    if (!v.length) return '—';
    return v.map(function (p) { var m = MODULES.filter(function (x) { return x.perm === p; })[0]; return m ? (t[m.key] || p) : p; }).join(', ');
  }
  if (field === 'role') return t['se_role_' + v] || v;
  if (field === 'status' && (v === 'active' || v === 'inactive')) return v === 'active' ? t.se_statusActive : t.se_statusInactive;
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
  var keys = [];
  [b, a].forEach(function (o) { if (o) Object.keys(o).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); });
  return keys.map(function (k) {
    return {
      field: k, label: auditFieldLabel(t, k),
      before: b ? auditValue(t, k, b[k], ctx) : null,
      after: a ? auditValue(t, k, a[k], ctx) : null,
      kind: b && a ? 'change' : (a ? 'add' : 'remove'),
    };
  });
}

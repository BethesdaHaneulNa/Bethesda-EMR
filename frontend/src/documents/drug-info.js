// How a drug's dosage form and its "to check" list (drugs brought in from the old
// stock program, migration 034) are shown. Pharmacy session; used by the pharmacy
// Stock tab and the settings drug tab. See wiki/modules/pharmacy.md 3.11.

// drug.dosage_form holds these English values (the old program's forms, corrected
// where the name plainly said otherwise); the screen translates them (ph_form_*).
var FORM_KEY = {
  'Tablet': 'tablet', 'Capsule': 'capsule', 'Syrup': 'syrup', 'Suppository': 'supp',
  'Powder / Sachet': 'sachet', 'Vaginal / Gel': 'vaggel', 'Topical': 'topical', 'Ophthalmic': 'ophth',
};
// The choices of the settings drug form, in this order.
export var DRUG_FORMS = Object.keys(FORM_KEY);
export function formLabel(t, form) {
  if (!form) return '';
  var k = FORM_KEY[form];
  return (k && t['ph_form_' + k]) || form;
}

// drug.import_check: [{ k: kind, d: detail }]. The kind is translated (ph_chk_<kind>);
// the detail is data from the old list (its quantity note, other codes, old text).
export function checkList(d) {
  return d && Array.isArray(d.import_check) ? d.import_check : [];
}
// Still to look at: there is a list and nobody has marked it checked.
export function checkOpen(d) {
  return checkList(d).length > 0 && !d.import_check_done_at;
}
export function checkText(t, c) {
  var label = t['ph_chk_' + c.k] || c.k;
  return c.d ? label + ' — ' + c.d : label;
}

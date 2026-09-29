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
  return c.d ? label + ' — ' + detailText(t, c) : label;
}

// The details are the old program's own notes, which count in Korean words
// ("60캡슐*66", "79병"). The staff read French, so on screen those five words are
// shown in the screen's language (ph_u_*; the Korean screen keeps them) and the
// quantity note reads as a sentence. The stored list is not changed.
var KO_UNITS = { '캡슐': 'ph_u_cap', '정': 'ph_u_tab', '병': 'ph_u_bottle', '개': 'ph_u_unit', '포': 'ph_u_sachet' };
function units(t, s) {
  return String(s).replace(/(\d)\s*(캡슐|정|병|개|포)/g, function (m, d, w) { return d + ' ' + (t[KO_UNITS[w]] || w); })
    .replace(/\s*\*\s*/g, ' × ');
}
function detailText(t, c) {
  // qty: "<old note> ≈ <what it comes to> ≠ <quantity imported>"
  var m = c.k === 'qty' && String(c.d).match(/^(.*) ≈ (\S+) ≠ (\S+)$/);
  if (m && t.ph_chkQtyDetail) return t.ph_chkQtyDetail.replace('{note}', units(t, m[1])).replace('{n}', m[2]).replace('{qty}', m[3]);
  return units(t, c.d);
}

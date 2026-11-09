// Phone numbers the Malagasy way (clinic manager, on site, 2026-11-08): ten digits starting
// with 0, written 3-2-3-2 - 034-12-345-67 (mobile 03x), 020-22-123-45 (landline 020).
// Typed or pasted, a number is reshaped as it is typed: only digits are kept, +261 / 261
// in front becomes the 0 (the international form is never stored), more than ten digits
// are dropped, the dashes are put in. The field often holds two numbers separated by
// "/", ";" or "," (phoneParts in PatientFinder.jsx): each is shaped on its own and they
// are joined with " / ". A number of another country (+33 ...) is left as typed, only
// trimmed. Numbers already stored are not touched until someone edits them (clinic manager:
// "new entries only").
export function fmtPhoneMg(raw) {
  var s = String(raw || '');
  if (!s.trim()) return '';
  var trailing = /[\/;,]\s*$/.test(s);           // a separator just typed: keep it so the second number can follow
  var parts = s.split(/\s*[\/;,]\s*/).filter(function (p) { return p.trim(); }).map(function (p) {
    p = p.trim();
    if (/^\+/.test(p) && !/^\+\s*261/.test(p)) return p;   // another country: as typed
    var d = p.replace(/\D/g, '');
    if (/^261/.test(d) && d.length > 10) d = '0' + d.slice(3);
    d = d.slice(0, 10);
    return [d.slice(0, 3), d.slice(3, 5), d.slice(5, 8), d.slice(8, 10)].filter(Boolean).join('-');
  }).filter(Boolean);
  return parts.join(' / ') + (trailing && parts.length ? ' / ' : '');
}

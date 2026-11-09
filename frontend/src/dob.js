// A birth date for the screen and the documents: DD/MM/YYYY, the way dates are written
// in Madagascar (clinic manager, on site, 2026-11-08: the staff read 1990-05-03 as the wrong
// day). The patient record keeps YYYY-MM-DD (the API and the database are unchanged);
// only birth dates change - visit, result and payment dates stay as they are until the
// clinic manager says otherwise. Anything that is not a date comes back unchanged.
export function fmtDob(d) {
  if (!d) return '';
  var s = typeof d === 'string' ? d : (d instanceof Date && !isNaN(d.getTime()) ? d.toISOString() : String(d));
  if (s.indexOf('T') >= 0) s = s.split('T')[0];
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : s;
}

// Text as it is compared in the lists' search boxes: lower case, accents removed
// (bug hunt 2026-11-10). "helene" must find Hélène - the clinic's keyboards have no
// accent keys - as the patient search on the server does (patient.routes.js foldSql).
export function fold(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// The languages the screens come in and the ones the clinic uses (clinic.languages, 066).
// Always in this order, never empty: what cannot be read is "all of them", so a damaged
// value can never leave the clinic without a language.
const LANGS = ['fr', 'en', 'ko'];

// what is stored ('fr,ko', null, anything) -> ['fr', 'ko']
function readLanguages(stored) {
  const list = Array.isArray(stored) ? stored.map(String) : String(stored == null ? '' : stored).split(',');
  const wanted = list.map(s => s.trim().toLowerCase());
  const out = LANGS.filter(l => wanted.includes(l));
  return out.length ? out : LANGS.slice();
}

// what a screen sends (['ko', 'fr'] or 'ko,fr') -> { value: 'fr,ko' } or { error: 'none' | 'unknown' }
function cleanLanguages(input) {
  let list;
  if (Array.isArray(input)) list = input;
  else if (typeof input === 'string') list = input.split(',');
  else return { error: 'none' };
  const wanted = [];
  for (const raw of list) {
    if (typeof raw !== 'string') return { error: 'unknown' };
    const l = raw.trim().toLowerCase();
    if (!l) continue;
    if (!LANGS.includes(l)) return { error: 'unknown' };
    wanted.push(l);
  }
  if (!wanted.length) return { error: 'none' };
  return { value: LANGS.filter(l => wanted.includes(l)).join(',') };
}

module.exports = { LANGS, readLanguages, cleanLanguages };

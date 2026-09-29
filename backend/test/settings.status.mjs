// Every message and item the status check can return (backend/src/routes/status.routes.js)
// has words in ko, en and fr for the top bar's status dot (frontend/src/pages/
// settingsStatus.jsx: 'status.backup.oldVersion' -> se_sys_backup_oldVersion, item key
// 'pacs_image_backup' -> se_sysItem_pacs_image_backup). No stack needed:
//
//   node backend/test/settings.status.mjs
//
// A check added to status.routes.js without its words fails here. Exit code 1 if so.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = fs.readFileSync(path.join(root, 'backend/src/routes/status.routes.js'), 'utf8');
const messages = [...new Set(src.match(/'status\.[A-Za-z]+(\.[A-Za-z]+)?'/g).map(s => s.slice(1, -1)))];
const items = [...new Set([...src.matchAll(/key: '([a-z_]+)'/g)].map(m => m[1]))];
const want = messages.map(m => 'se_sys_' + m.replace(/^status\./, '').replace(/\./g, '_'))
  .concat(items.map(k => 'se_sysItem_' + k))
  .concat(['se_sysOverall_ok', 'se_sysOverall_warn', 'se_sysOverall_down', 'se_sysOverall_none']);

let failed = 0;
for (const lang of ['ko', 'en', 'fr']) {
  const text = fs.readFileSync(path.join(root, 'frontend/src/i18n/' + lang + '.js'), 'utf8');
  const missing = want.filter(k => !new RegExp('^\\s*' + k + ':', 'm').test(text));
  if (missing.length) { failed++; console.log('  [FAIL] ' + lang + ' has no words for: ' + missing.join(', ')); }
  else console.log('  [ok]   ' + lang + ': ' + want.length + ' keys');
}
console.log(`  (${messages.length} messages, ${items.length} items in status.routes.js)`);
console.log(failed ? '\nadd the se_sys* keys in ko/en/fr (settings block)' : '\nevery status message has words on screen');
process.exit(failed ? 1 : 0);

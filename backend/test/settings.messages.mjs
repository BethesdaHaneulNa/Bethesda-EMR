// Does the screen still recognise every message the login and settings API sends?
//
//   node backend/test/settings.messages.mjs
//
// The server sends fixed English strings (backend/src/routes/settings.messages.js, plus
// utils/dbError.js); the Settings and Login screens translate them by matching the text
// (frontend/src/pages/settingsMessages.js), because api/client.js does not pass the
// status code on. If one side changes a string and the other does not, the person just
// sees English again - nothing fails loudly. This does. No install, server or database
// needed. Exit code 1 on any mismatch.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const imp = p => import(pathToFileURL(path.join(root, p)).href);
const { MSG, fieldMsg } = createRequire(import.meta.url)(path.join(root, 'backend/src/routes/settings.messages.js'));
const screen = await imp('frontend/src/pages/settingsMessages.js');
const langs = {};
for (const l of ['ko', 'en', 'fr']) langs[l] = (await imp(`frontend/src/i18n/${l}.js`)).default;

let failed = 0;
function check(label, ok, detail) {
  console.log((ok ? '  [ok]   ' : '  [FAIL] ') + label + (ok || !detail ? '' : '  -> ' + detail));
  if (!ok) failed++;
}
// Translated in every language = the text changed, and no key came back unresolved.
// English is allowed to come back word for word (en.js may say exactly what the
// server says); Korean and French must not.
function translatesEverywhere(text) {
  for (const l of Object.keys(langs)) {
    const out = screen.seMessage(langs[l], text);
    if ((out === text && l !== 'en') || !out || /undefined|\{f\}/.test(out)) return l + ': ' + JSON.stringify(out);
  }
  return null;
}

// Every fixed message, except the stock one: that one carries a number and is handled
// in Settings.jsx itself, so check it is spelled the same there.
for (const [name, text] of Object.entries(MSG)) {
  if (name === 'STOCK_CHANGED') {
    const src = fs.readFileSync(path.join(root, 'frontend/src/pages/Settings.jsx'), 'utf8');
    check('MSG.STOCK_CHANGED spelled the same in Settings.jsx', src.includes(JSON.stringify(text).slice(1, -1)));
    continue;
  }
  const bad = translatesEverywhere(text);
  check('MSG.' + name, !bad, bad);
}
// The built ones, with the field names the settings API actually uses.
for (const f of ['unit_price', 'price', 'price_clinic', 'stock_qty', 'min_stock']) {
  for (const kind of ['notNumber', 'negative', 'notWhole']) {
    const bad = translatesEverywhere(fieldMsg[kind](f));
    check(`fieldMsg.${kind}('${f}')`, !bad, bad);
  }
}
for (const [f, allowed] of [['role', ['frontdesk', 'admin']], ['code_type', ['fee', 'lab']]]) {
  const bad = translatesEverywhere(fieldMsg.notOneOf(f, allowed));
  check(`fieldMsg.notOneOf('${f}')`, !bad, bad);
}
// middleware/auth.js (the coordinator's file): every error: '...' it sends.
const mwSrc = fs.readFileSync(path.join(root, 'backend/src/middleware/auth.js'), 'utf8');
const mwMsgs = [...new Set([...mwSrc.matchAll(/error:\s*'([^']+)'/g)].map(m => m[1]))];
check('found middleware/auth.js messages', mwMsgs.length >= 4, mwMsgs.length + ' found');
for (const text of mwMsgs) {
  const bad = translatesEverywhere(text);
  check('middleware: ' + text, !bad, bad);
}
// utils/dbError.js (the coordinator's file) does not export its messages; read them.
const dbSrc = fs.readFileSync(path.join(root, 'backend/src/utils/dbError.js'), 'utf8');
const block = dbSrc.slice(dbSrc.indexOf('MESSAGE_BY_PG_CODE'));
const dbMsgs = [...block.slice(0, block.indexOf('};')).matchAll(/:\s*'([^']+)'/g)].map(m => m[1]);
check('found utils/dbError.js messages', dbMsgs.length >= 5, dbMsgs.length + ' found');
for (const text of dbMsgs) {
  const bad = translatesEverywhere(text);
  check('dbError: ' + text, !bad, bad);
}

console.log(failed ? `\n${failed} check(s) failed - update frontend/src/pages/settingsMessages.js (and the se_ keys)` : '\nevery server message is translated on screen');
process.exit(failed ? 1 : 0);

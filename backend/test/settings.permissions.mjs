// Do the backend's permission lists still match frontend/src/modules.js?
//
//   node backend/test/settings.permissions.mjs
//
// modules.js is the list the app is built around: the menu, the route guard and the
// staff permission checkboxes all come from it. The backend cannot import it (its
// image is built from backend/ alone), so middleware/permissions.js keeps one mirror
// of it. Run this after adding or renaming a module. No database, server or npm
// install needed; it only reads the two files. Exit code 1 if they disagree.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

const backend = createRequire(import.meta.url)(path.join(root, 'backend', 'src', 'middleware', 'permissions.js'));
const frontend = await import(pathToFileURL(path.join(root, 'frontend', 'src', 'modules.js')).href);

let failed = 0;
function check(label, a, b) {
  const same = JSON.stringify(a) === JSON.stringify(b);
  console.log((same ? '  [ok]   ' : '  [FAIL] ') + label + (same ? '' : '\n         backend:  ' + JSON.stringify(a) + '\n         frontend: ' + JSON.stringify(b)));
  if (!same) failed++;
}

check('all permissions, in menu order', Array.from(backend.ALL_PERMS), frontend.MODULES.map(m => m.perm));
// The roles the staff form offers (admin.routes.js ROLES and the staff CHECK constraint).
for (const role of ['admin', 'frontdesk', 'doctor', 'nurse', 'pharmacy', 'lab', 'nobody']) {
  check('default permissions for role ' + role, backend.defaultPermsForRole(role), frontend.defaultPermsForRole(role));
}
// Callers are allowed to change what they get back; that must not reach the shared list.
const got = backend.defaultPermsForRole('admin'); got.push('x');
check('defaultPermsForRole returns a copy', backend.defaultPermsForRole('admin').length, frontend.MODULES.length);

console.log(failed ? `\n${failed} check(s) failed - make backend/src/middleware/permissions.js match frontend/src/modules.js` : '\nbackend and frontend permission lists match');
process.exit(failed ? 1 : 0);

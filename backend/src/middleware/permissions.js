// The backend's one copy of the module permissions.
//
// The list the app is built around is frontend/src/modules.js (MODULES[].perm and
// defaultPermsForRole): the menu, the route guard and the staff permission
// checkboxes all come from it. The backend image is built from backend/ alone and
// cannot import it, so it is mirrored here - once - and everything on the server
// takes it from here (middleware/auth.js, admin.routes.js, auth.routes.js). It used
// to be spelled out in four places, and a module added to one of them would have
// been silently missing from the setup wizard's first admin or from the protected
// admin account.
//
// No dependencies on purpose, so `node backend/test/settings.permissions.mjs` can
// compare it with modules.js without installing anything. Run that after adding
// or renaming a module.
const ALL_PERMS = Object.freeze(['registration', 'consultation', 'payment', 'pharmacy', 'lab', 'stats', 'settings']);

const ROLE_DEFAULT_PERMS = Object.freeze({
  admin: ALL_PERMS,
  frontdesk: Object.freeze(['registration', 'payment']),
  // Decided 2026-09-29: doctors also get pharmacy (there is no pharmacist). Only a new
  // account or a role change picks this up; an account saved earlier keeps its own list.
  doctor: Object.freeze(['consultation', 'pharmacy']),
  pharmacy: Object.freeze(['pharmacy']),
  lab: Object.freeze(['lab']),
  // No pharmacist at the clinic: nurses dispense and run the lab. Registration was
  // added by decision (2026-09-29) so nurses can read the patient's chart - note it is
  // the whole reception screen, including registering patients and visits; there is
  // no read-only permission. Change together with frontend/src/modules.js.
  nurse: Object.freeze(['registration', 'pharmacy', 'lab']),
});

// A fresh, ordinary array each call, as before: callers may keep or change what
// they get, and the pg driver wants a plain array.
function defaultPermsForRole(role) {
  return (Object.prototype.hasOwnProperty.call(ROLE_DEFAULT_PERMS, role) ? ROLE_DEFAULT_PERMS[role] : []).slice();
}

module.exports = { ALL_PERMS, ROLE_DEFAULT_PERMS, defaultPermsForRole };

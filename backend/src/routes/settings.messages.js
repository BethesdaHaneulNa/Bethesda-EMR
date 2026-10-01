// Every message the login and settings API (auth.routes.js, admin.routes.js) sends
// to be shown to a person.
//
// They are English on purpose and are not shown as they are: api/client.js passes
// the text of an error on but not its status code, so the screens recognise these
// exact strings and show their own se_ translation instead - otherwise a French
// screen said "Invalid credentials" or "This is the last active administrator...".
// The matching table is frontend/src/pages/settingsMessages.js.
//
// CHANGE A STRING HERE AND CHANGE IT THERE TOO. A string the screen does not know
// still reaches the person, just untranslated.
const MSG = Object.freeze({
  LOGIN_REQUIRED: 'Login ID and password required',
  INVALID_CREDENTIALS: 'Invalid credentials',
  ACCOUNT_INACTIVE: 'Account is inactive',
  SERVER_ERROR: 'Server error',
  SETUP_DONE: 'Setup already completed',
  PASSWORD_TOO_SHORT: 'Password must be at least 6 characters',
  LOGIN_EXISTS: 'Login ID already exists',
  USER_NOT_FOUND: 'User not found',
  NOT_FOUND: 'Not found',
  LOGIN_ID_REQUIRED: 'login_id is required',
  PASSWORD_REQUIRED: 'password is required',
  CURRENT_PASSWORD_WRONG: 'The current password is not correct',
  LAST_ADMIN: 'This is the last active administrator who can open Settings. Give another account the admin role and the settings permission first.',
  REACTIVATE_ADMIN_ONLY: 'Only an administrator can reactivate a staff account.',
  SETUP_ADMIN_KEPT: 'The administrator account created during setup cannot be deactivated.',
  // phrases and their categories (admin.routes.js, 2026-10-01)
  PHRASE_TEXT_REQUIRED: 'Phrase text is required',
  PHRASE_CATEGORY_REQUIRED: 'Choose a category for the phrase',
  CATEGORY_NAME_REQUIRED: 'Category name is required',
  CATEGORY_NAME_LONG: 'Category name is too long (60 characters at most)',
  CATEGORY_EXISTS: 'A category with that name already exists',
  CATEGORY_MOVE_TARGET: 'Choose another category to move the phrases to',
  CATEGORY_ORDER: 'ids must list every category once',
});

// These name the field they are about, so they are built rather than fixed; the
// screen matches them by shape ("<field> must be a number").
const fieldMsg = Object.freeze({
  notNumber: field => field + ' must be a number',
  negative: field => field + ' must not be negative',
  notWhole: field => field + ' must be a whole number',
  notOneOf: (field, allowed) => field + ' must be one of ' + allowed.join(', '),
});

// A category that still holds phrases is not removed silently: the number is part of the
// message ("... has 3 phrase(s) ..."), and the screen matches it by shape.
const phraseMsg = Object.freeze({
  categoryInUse: n => 'This category has ' + n + ' phrase(s). Move them to another category or delete them first.',
});

module.exports = { MSG, fieldMsg, phraseMsg };

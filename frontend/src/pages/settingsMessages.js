// Turns an English message from the server into the screen's language, for the
// Settings and Login screens.
//
// api/client.js hands a failed request on as `new Error(<the server's text>)` and
// drops the status code, so the only thing to go on is the text itself. The server
// sends fixed English strings (backend/src/routes/settings.messages.js) and this table
// recognises them. CHANGE A STRING THERE AND CHANGE IT HERE TOO - a string this table
// does not know is shown as it came, untranslated, rather than hidden.
//
// Also listed: the messages of utils/dbError.js (the coordinator's file, used by the
// settings API for duplicate codes and the like) and of api/client.js itself.

// server text -> se_ key (or an existing key that already says it)
var EXACT = {
  // settings.messages.js MSG
  'Login ID and password required': 'loginError',
  'Invalid credentials': 'loginError',
  'Account is inactive': 'se_errInactive',
  'Server error': 'se_errServer',
  'Setup already completed': 'se_errSetupDone',
  'Password must be at least 6 characters': 'pwTooShort',
  'Login ID already exists': 'se_errLoginExists',
  'User not found': 'se_errNotFound',
  'Not found': 'se_errNotFound',
  'login_id is required': 'se_errLoginIdRequired',
  'password is required': 'se_errPasswordRequired',
  'Only an administrator can reactivate a staff account.': 'se_errReactivateAdmin',
  'The current password is not correct': 'se_errCurrentPw',
  'This is the last active administrator who can open Settings. Give another account the admin role and the settings permission first.': 'se_errLastAdmin',
  'The administrator account created during setup cannot be deactivated.': 'se_errSetupAdminKept',
  // phrases and their categories (settings.messages.js MSG, 2026-10-01)
  'Phrase text is required': 'se_errPhraseText',
  'Choose a category for the phrase': 'se_errPhraseCategory',
  'Category name is required': 'se_errCatName',
  'Category name is too long (60 characters at most)': 'se_errCatNameLong',
  'A category with that name already exists': 'se_errCatExists',
  'Choose another category to move the phrases to': 'se_errCatMoveTarget',
  'ids must list every category once': 'se_errCatOrder',
  'Modality must be 1 to 16 letters, digits or underscores (for example US, CR, AS)': 'se_errModality',
  // utils/dbError.js
  'A record with that code or ID already exists': 'se_errDuplicate',
  'Referenced record does not exist': 'se_errMissingRef',
  'A required field is missing': 'se_errRequired',
  'A field has a value that is not allowed': 'se_errNotAllowed',
  'A field has the wrong format': 'se_errFormat',
  'A date field has the wrong format': 'se_errFormat',
  'A date field has a date that does not exist': 'se_errBadDate',
  'A number is out of range': 'se_errRange',
  // middleware/auth.js (the coordinator's file). A 401 with a token sent never reaches a
  // screen - api/client.js returns to the login page - so these show only on login.
  'Access denied': 'se_errAccessDenied',
  'Could not verify the account': 'se_errServer',
  'No token provided': 'se_errSessionEnded',
  'Invalid token': 'se_errSessionEnded',
  // api/client.js
  'Request failed': 'se_errServer',
  // orderset.routes.js (consultation session)
  'name required': 'se_osErrName',
};

// settings.messages.js fieldMsg: "<field> must be ..." - the field is named in the screen's words.
var FIELD_KEY = {
  unit_price: 'se_colPrice', price: 'se_colPrice', price_clinic: 'se_colPrice',
  stock_qty: 'se_fStock', min_stock: 'se_fMinStock',
  role: 'se_colRole', code_type: 'se_colType', permissions: 'se_fld_permissions',
};
var SHAPES = [
  [/^(\w+) must be a number$/, 'se_errNotNumber'],
  [/^(\w+) must not be negative$/, 'se_errNegative'],
  [/^(\w+) must be a whole number$/, 'se_errNotWhole'],
  [/^(\w+) must be one of .*$/, 'se_errNotAllowed'],
];

// Order-set refusals from the consultation session's route (orderset.routes.js badItems,
// 2026-09-29): "items[<i>].<field> <meaning>", i from 0. The screen names the line as
// i + 1 (the order the lines are shown in). The table is theirs (wiki/handoff/
// consultation.md); the words are ours.
var ORDERSET_ITEM = {
  'dose must be a number greater than 0': 'se_osErrDose',
  'frequency must be a whole number from 1 to 24': 'se_osErrFrequency',
  'days must be a whole number from 1 to 365': 'se_osErrDays',
  'route (sig) must be at most 10 characters': 'se_osErrRoute',
  'quantity must be a whole number of at least 1': 'se_osErrPackQty',
  'quantity must be a positive number': 'se_osErrQuantity',
};

// settings.messages.js phraseMsg.categoryInUse(n): the number of phrases is part of the message.
var CATEGORY_IN_USE = /^This category has (\d+) phrase\(s\)\. Move them to another category or delete them first\.$/;

export function seMessage(t, text) {
  var s = String(text || '');
  if (EXACT[s] && t[EXACT[s]]) return t[EXACT[s]];
  var inUse = s.match(CATEGORY_IN_USE);
  if (inUse && t.se_errCatInUse) return t.se_errCatInUse.replace('{n}', inUse[1]);
  var it = s.match(/^items\[(\d+)\]\.(.+)$/);
  if (it && ORDERSET_ITEM[it[2]] && t[ORDERSET_ITEM[it[2]]]) return t[ORDERSET_ITEM[it[2]]].replace('{n}', Number(it[1]) + 1);
  // api/client.js: the server or the proxy in front of it did not answer properly.
  if (s.indexOf('API response was not JSON') === 0) return t.se_errServer || s;
  for (var i = 0; i < SHAPES.length; i++) {
    var m = s.match(SHAPES[i][0]);
    if (m && t[SHAPES[i][1]]) return t[SHAPES[i][1]].replace('{f}', t[FIELD_KEY[m[1]]] || m[1]);
  }
  return s;
}

// For backend/test/settings.messages.mjs, which checks the two lists still agree.
export var KNOWN_EXACT = Object.keys(EXACT);
export var KNOWN_ORDERSET_ITEM = Object.keys(ORDERSET_ITEM);
export var KNOWN_SHAPES = SHAPES.map(function (x) { return x[0]; });

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
  'This is the last active administrator who can open Settings. Give another account the admin role and the settings permission first.': 'se_errLastAdmin',
  'The administrator account created during setup cannot be deactivated.': 'se_errSetupAdminKept',
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
};

// settings.messages.js fieldMsg: "<field> must be ..." - the field is named in the screen's words.
var FIELD_KEY = {
  unit_price: 'se_colPrice', price: 'se_colPrice', price_clinic: 'se_colPrice',
  stock_qty: 'se_fStock', min_stock: 'se_fMinStock',
  role: 'se_colRole', code_type: 'se_colType',
};
var SHAPES = [
  [/^(\w+) must be a number$/, 'se_errNotNumber'],
  [/^(\w+) must not be negative$/, 'se_errNegative'],
  [/^(\w+) must be a whole number$/, 'se_errNotWhole'],
  [/^(\w+) must be one of .*$/, 'se_errNotAllowed'],
];

export function seMessage(t, text) {
  var s = String(text || '');
  if (EXACT[s] && t[EXACT[s]]) return t[EXACT[s]];
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
export var KNOWN_SHAPES = SHAPES.map(function (x) { return x[0]; });

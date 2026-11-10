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
  // a department belongs to a doctor's account only (admin.routes.js staffDepartment, 2026-11-10)
  STAFF_DEPT_REQUIRED: 'Choose the department of the doctor',
  STAFF_DEPT_BAD: 'The department of the doctor must be one of the active departments',
  // phrases and their categories (admin.routes.js, 2026-10-01)
  PHRASE_TEXT_REQUIRED: 'Phrase text is required',
  PHRASE_CATEGORY_REQUIRED: 'Choose a category for the phrase',
  CATEGORY_NAME_REQUIRED: 'Category name is required',
  CATEGORY_NAME_LONG: 'Category name is too long (60 characters at most)',
  CATEGORY_EXISTS: 'A category with that name already exists',
  CATEGORY_MOVE_TARGET: 'Choose another category to move the phrases to',
  CATEGORY_ORDER: 'ids must list every category once',
  // drug categories (admin.routes.js, 2026-11-09): rows the clinic keeps itself
  DRUG_CATEGORY_NAME_REQUIRED: 'The French name of the drug category is required',
  DRUG_CATEGORY_NAME_LONG: 'A drug category name is too long (60 characters at most)',
  DRUG_CATEGORY_EXISTS: 'A drug category with that name already exists',
  DRUG_CATEGORY_FIXED: 'The category "Other" cannot be hidden or removed',
  DRUG_CATEGORY_ORDER: 'keys must list every drug category once',
  DRUG_CATEGORY_UNKNOWN: 'Unknown drug category',
  // order-code groups (admin.routes.js, 2026-11-09): rows the clinic keeps itself
  ORDER_GROUP_NAME_REQUIRED: 'The group name is required',
  ORDER_GROUP_NAME_LONG: 'The group name is too long (50 characters at most)',
  ORDER_GROUP_EXISTS: 'A group with that name already exists',
  ORDER_GROUP_ORDER: 'names must list every group once',
  ORDER_GROUP_UNKNOWN: 'Unknown order-code group',
  // departments (admin.routes.js, 2026-11-09)
  DEPARTMENT_LAST_ACTIVE: 'At least one department must stay active',
  // the list of frequent diagnoses (admin.routes.js, 2026-10-02)
  DIAGNOSIS_NAME_REQUIRED: 'The English name of the diagnosis is required',
  DIAGNOSIS_CODE_LONG: 'The diagnosis code is too long (20 characters at most)',
  DIAGNOSIS_NAME_LONG: 'A diagnosis name is too long (200 characters at most)',
  DIAGNOSIS_ORDER: 'ids must list every diagnosis once',
  // an order code's imaging modality (admin.routes.js cleanModality)
  MODALITY_FORMAT: 'Modality must be 1 to 16 letters, digits or underscores (for example US, CR, AS)',
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

// A drug category still on drugs is not removed: the number is part of the message and the
// screen offers "hide" instead.
const drugMsg = Object.freeze({
  categoryInUse: n => 'This category is on ' + n + ' drug(s). Hide it instead of removing it.',
  groupInUse: n => 'This group is on ' + n + ' order code(s). Hide it instead of removing it.',
});

module.exports = { MSG, fieldMsg, phraseMsg, drugMsg };

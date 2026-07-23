// Shared field checks for records that outlive the screen that created them.
// A patient row feeds DICOM worklists, age-based dosing and reports, so a blank
// name or a birth date in the future is worth refusing at the API rather than
// storing and discovering later.

const GENDERS = ['M', 'F', 'O'];
const VISIT_TYPES = ['newVisit', 'followUp', 'emergency', 'referral', 'none'];
// Must stay in step with the visit_status_check constraint in 001_schema.sql.
const VISIT_STATUSES = ['registered', 'waiting', 'in_progress', 'completed', 'cancelled'];
// Must stay in step with the billing_payment_status_check constraint.
const PAYMENT_STATUSES = ['waiting', 'paid', 'partial', 'unpaid', 'waived', 'cancelled'];

function badPatient({ last_name, first_name, date_of_birth, gender }) {
  if (!String(last_name || '').trim() && !String(first_name || '').trim()) {
    return 'Patient name is required';
  }
  if (date_of_birth) {
    const dob = new Date(date_of_birth);
    if (isNaN(dob.getTime())) return 'date_of_birth is not a valid date';
    // Compare against the end of today so a birth registered the same day passes.
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    if (dob > endOfToday) return 'date_of_birth cannot be in the future';
    if (dob.getFullYear() < 1875) return 'date_of_birth is implausibly old';
  }
  if (gender != null && String(gender) !== '' && !GENDERS.includes(String(gender))) {
    return 'gender must be one of ' + GENDERS.join(', ');
  }
  return null;
}

// Prescription and order quantities are multiplied into the bill, so a negative
// value silently reduces (or reverses) what the patient owes, and a mistyped
// dose or duration is a dispensing hazard on top of that. The UI puts min="1" on
// these inputs, but that only drives the spinner arrows — a typed value still
// reaches the API, so the limits have to hold here too.
const LIMITS = {
  dose: { min: 0, max: 1000, integer: false },
  frequency: { min: 1, max: 24, integer: true },
  days: { min: 1, max: 365, integer: true },
  quantity: { min: 0, max: 10000, integer: false },
  total_qty: { min: 0, max: 100000, integer: false },
  unit_price: { min: 0, max: 100000000, integer: false },
};

function badAmounts(body, fields) {
  for (const field of fields) {
    const raw = body[field];
    if (raw === undefined || raw === null || raw === '') continue;
    const limit = LIMITS[field];
    const value = Number(raw);
    if (!isFinite(value)) return field + ' must be a number';
    if (limit.integer && !Number.isInteger(value)) return field + ' must be a whole number';
    if (value < limit.min) return field + ' must be at least ' + limit.min;
    if (value > limit.max) return field + ' must be at most ' + limit.max;
  }
  return null;
}

// Report date ranges arrive straight from the query string. Handed to Postgres
// as-is, anything that is not a date comes back as a 500 with a raw driver
// message, which reads as "the statistics are broken" rather than "check the
// dates you typed".
function badDateRange(from, to) {
  for (const [label, value] of [['from', from], ['to', to]]) {
    if (value === undefined || value === null || value === '') continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || isNaN(new Date(value).getTime())) {
      return label + ' must be a date in YYYY-MM-DD form';
    }
  }
  if (from && to && String(from) > String(to)) return 'from must not be later than to';
  return null;
}

module.exports = {
  badPatient, badAmounts, badDateRange,
  GENDERS, VISIT_TYPES, VISIT_STATUSES, PAYMENT_STATUSES,
};

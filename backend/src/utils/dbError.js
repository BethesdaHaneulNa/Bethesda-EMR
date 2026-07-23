// Constraint violations reached the client as HTTP 500 carrying the raw driver
// text ("new row for relation \"drug\" violates check constraint ..."). That
// reads as a broken server rather than a rejected entry, and it publishes the
// schema. These are all cases where the request was wrong, so map them onto the
// 4xx they are and keep the field names the user can actually see.
const STATUS_BY_PG_CODE = {
  '23505': 409, // unique_violation      — that code / login id is already taken
  '23503': 400, // foreign_key_violation — points at a row that is not there
  '23502': 400, // not_null_violation    — a required field was left out
  '23514': 400, // check_violation       — value outside the allowed set
  '22P02': 400, // invalid_text_representation — e.g. "abc" for a numeric column
  '22007': 400, // invalid_datetime_format
  '22003': 400, // numeric_value_out_of_range
};

const MESSAGE_BY_PG_CODE = {
  '23505': 'A record with that code or ID already exists',
  '23503': 'Referenced record does not exist',
  '23502': 'A required field is missing',
  '23514': 'A field has a value that is not allowed',
  '22P02': 'A field has the wrong format',
  '22007': 'A date field has the wrong format',
  '22003': 'A number is out of range',
};

// Usage: catch (err) { return sendDbError(res, err); }
function sendDbError(res, err) {
  const status = STATUS_BY_PG_CODE[err && err.code];
  if (!status) return res.status(500).json({ error: err.message });
  // err.detail names the offending column/value and is useful to staff fixing
  // the entry; err.message is the internal constraint name, which is not.
  return res.status(status).json({
    error: MESSAGE_BY_PG_CODE[err.code], detail: err.detail || undefined,
  });
}

module.exports = { sendDbError };

// "Today" always means today at the clinic, never today in UTC.
//
// The containers run with TZ set (e.g. Indian/Antananarivo, UTC+3), and the
// browser shows the staff their own local date. new Date().toISOString() is
// always UTC, so between local midnight and the UTC offset the backend's idea
// of "today" is still yesterday — night and early-morning visits land on the
// wrong day's payment list and daily cash report. en-CA formats as YYYY-MM-DD,
// which is the same shape the API and Postgres expect.
function todayLocal() {
  return new Date().toLocaleDateString('en-CA');
}

// A DATE column arrives from node-postgres as a Date at midnight *local* time,
// so reading it back with toISOString() moves it across the UTC offset and the
// date leaves the building a day early: a patient born on the 10th is sent to
// the imaging device as the 9th, and today's order is scheduled for yesterday --
// which a device that queries the worklist for today will not match at all.
// Format in the same zone the value was built in. DICOM wants YYYYMMDD.
function dicomDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA').replace(/-/g, '');
}

module.exports = { todayLocal, dicomDate };

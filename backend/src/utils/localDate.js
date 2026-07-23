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

module.exports = { todayLocal };

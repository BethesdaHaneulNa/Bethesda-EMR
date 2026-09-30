-- 022 (coordinator): one change log for the whole EMR.
--
-- Decided 2026-09-29 (wiki/decisions.md): keep a record of who changed what, shown
-- nowhere on the working screens - only administrators read it, in Settings.
-- Six kinds of change are written here:
--   lab result corrected · a finished consultation record edited · a prescription
--   or order deleted/cancelled · a receipt cancelled or corrected · patient
--   identity edited · staff account or permissions changed.
-- Reading is not logged. Stock has its own record (stock_movement, 021).
--
-- Rows are written by writeAudit() in backend/src/utils/audit.js, inside the same
-- transaction as the change. No foreign keys on purpose: the log must outlive the
-- row it describes (a deleted prescription still has its line here), so ids are
-- plain numbers and the names are copied in at the time of writing.
--
-- A row is never edited and never removed: the trigger below refuses UPDATE and
-- DELETE for every database user, including the application's own.
-- Adds one table; no existing value is changed.

CREATE TABLE IF NOT EXISTS audit_log (
    id           BIGSERIAL PRIMARY KEY,
    -- clock_timestamp(): the moment of the change, not the start of a transaction
    -- that may have waited for a lock (same reason as stock_movement).
    at           TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    staff_id     INTEGER,
    staff_name   TEXT,
    staff_role   TEXT,
    module       VARCHAR(20) NOT NULL,
    action       VARCHAR(40) NOT NULL,
    patient_id   INTEGER,
    patient_name TEXT,
    chart_no     TEXT,
    visit_id     INTEGER,
    entity       VARCHAR(40),
    entity_id    TEXT,
    summary      TEXT,
    before_value JSONB,
    after_value  JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_at      ON audit_log (at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_patient ON audit_log (patient_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_staff   ON audit_log (staff_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action  ON audit_log (action, at DESC);

CREATE OR REPLACE FUNCTION audit_log_is_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_change ON audit_log;
CREATE TRIGGER audit_log_no_change
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();

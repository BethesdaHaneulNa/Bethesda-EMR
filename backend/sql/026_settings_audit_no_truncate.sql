-- 026 (settings, session number 702): the change log refuses TRUNCATE too.
--
-- 022 made audit_log append-only with a row trigger that refuses UPDATE and DELETE.
-- A row trigger never sees TRUNCATE, which empties the whole table in one statement:
-- tested 2026-09-29 on a restored copy - UPDATE and DELETE refused, TRUNCATE went
-- through and all lines were gone. The decision (wiki/decisions.md) is that no one can
-- edit or delete the log, so the same function is attached as a statement trigger.
--
-- Not covered, on purpose: DROP TABLE (a restore with pg_dump --clean drops and
-- recreates the table, so blocking it would block restoring a backup) and anything a
-- database superuser chooses to do deliberately. This guards against mistakes and
-- against the application, not against someone with the database password.
-- Adds a trigger only; no row is changed. Safe to run more than once.
DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_log;
CREATE TRIGGER audit_log_no_truncate
    BEFORE TRUNCATE ON audit_log
    FOR EACH STATEMENT EXECUTE FUNCTION audit_log_is_append_only();

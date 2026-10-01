-- 201 (consultation; session number - the coordinator renumbers it): which doctors'
-- patients the consultation screen's waiting list shows, per account.
--
-- Decided by the director on 2026-10-01: "does each doctor see everyone when they sign
-- in? Let them set it - a settings button on the waiting list, the list of doctors, and
-- they tick." Until now the rule was fixed in the screen: a doctor account saw its own
-- patients and the patients with no doctor, every other account saw all.
--
-- One row per account that chose; NO ROW = that fixed rule, so an account that never
-- opens the settings sees exactly what it saw before. Remembered per account (not per
-- PC), like the theme (037) - but in its own table, so the choice does not travel with
-- the staff list (GET /admin/staff returns staff.*).
--   all_doctors  every doctor, including one hired later (all boxes ticked)
--   doctor_ids   the ticked doctors when not all. An id whose account was later closed
--                or removed simply matches no visit; nothing depends on it existing.
--   unassigned   also show the patients registered with no doctor
-- Read and written only by /api/consultations/queue-filter, for the signed-in account.
-- Creates a table; changes no existing data. Safe to run more than once.
CREATE TABLE IF NOT EXISTS consultation_queue_filter (
  staff_id    INTEGER PRIMARY KEY REFERENCES staff(id) ON DELETE CASCADE,
  all_doctors BOOLEAN NOT NULL DEFAULT false,
  doctor_ids  INTEGER[] NOT NULL DEFAULT '{}',
  unassigned  BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 902 (design session number; the coordinator renumbers it): a third screen, 'paper'.
--
-- Asked for by the director on 2026-10-01: the warm paper screen of the mockups (proposal B)
-- beside dark and light. 037 allowed only 'dark' and 'light' in staff.theme; this widens
-- the check to the three. The column, its default ('dark') and every stored value stay as
-- they are. Safe to run more than once.
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_theme_check;
ALTER TABLE staff ADD CONSTRAINT staff_theme_check CHECK (theme IN ('dark', 'light', 'paper'));

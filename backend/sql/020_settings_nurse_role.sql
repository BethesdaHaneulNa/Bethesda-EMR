-- 701 (settings session): allow the 'nurse' role.
--
-- At the clinic in Madagascar there is no pharmacist: nurses do the nursing, the
-- dispensing and the lab work (wiki/00-overview.md 2-1, wiki/decisions.md). With
-- only frontdesk/doctor/pharmacy/lab/admin, a nurse's account had to be made as
-- "pharmacy" with the lab permission ticked by hand, and was labelled as a pharmacist.
--
-- This only widens the allowed values; no existing row changes, and the pharmacy and
-- lab roles stay. The role is a label - what a nurse can open is still the account's
-- permissions (default pharmacy + lab: backend/src/middleware/permissions.js and
-- frontend/src/modules.js). Safe to run more than once.
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE staff ADD CONSTRAINT staff_role_check
  CHECK (role IN ('frontdesk','doctor','pharmacy','lab','admin','nurse'));

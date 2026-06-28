-- 013: granular per-module permissions for staff.
-- 'role' stays as the primary label/badge; 'permissions' controls actual access.
-- Safe to run multiple times.

ALTER TABLE staff ADD COLUMN IF NOT EXISTS permissions TEXT[];

-- allow 'lab' as a role label (for the upcoming clinical pathology module)
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE staff ADD CONSTRAINT staff_role_check
  CHECK (role IN ('frontdesk','doctor','pharmacy','lab','admin'));

-- backfill permissions from the existing single role
UPDATE staff SET permissions = CASE role
    WHEN 'admin'     THEN ARRAY['registration','consultation','payment','pharmacy','lab','stats','settings']
    WHEN 'frontdesk' THEN ARRAY['registration','payment']
    WHEN 'doctor'    THEN ARRAY['consultation']
    WHEN 'pharmacy'  THEN ARRAY['pharmacy']
    WHEN 'lab'       THEN ARRAY['lab']
    ELSE ARRAY[]::text[]
  END
  WHERE permissions IS NULL;

-- 063 (1.7.17): the groups an order code is filed under become rows the clinic keeps.
--
-- The clinic's manager, 2026-11-09: like the drug categories (060), the list was fixed in
-- the Settings screen (Consultation, Issuance, Laboratory, Radiology, Ultrasound,
-- Endoscopy, Surgery, Supply, Other) and could not be changed on site. order_code.group_name
-- keeps storing the group's name as text (no foreign key: an old value is still shown);
-- renaming a group renames it on its codes in the same transaction.
-- Filled once: the nine names the screen knew, in their order, then any other name a code
-- already carries.
CREATE TABLE IF NOT EXISTS order_group (
    name        VARCHAR(50) PRIMARY KEY,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_hidden   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO order_group (name, sort_order) VALUES
  ('Consultation', 10), ('Issuance', 20), ('Laboratory', 30), ('Radiology', 40), ('Ultrasound', 50),
  ('Endoscopy', 60), ('Surgery', 70), ('Supply', 80), ('Other', 999)
ON CONFLICT (name) DO NOTHING;
INSERT INTO order_group (name, sort_order)
SELECT DISTINCT btrim(oc.group_name), 900 FROM order_code oc
 WHERE oc.group_name IS NOT NULL AND btrim(oc.group_name) <> ''
ON CONFLICT (name) DO NOTHING;

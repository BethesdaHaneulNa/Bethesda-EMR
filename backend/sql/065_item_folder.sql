-- 065 (1.8.0): folders, and folders inside folders, for the lab tests and the order sets.
--
-- The clinic's manager, 2026-11-10: the two Settings tabs were hard to use - the lab items
-- behind a single "choose a panel" box (nothing to see until one is chosen, one panel at a
-- time), the order sets under a group typed as text, one level deep. Both become a list on
-- the left that shows everything, filed in folders the clinic makes itself, a folder inside
-- a folder where it helps. The consultation screen's order-set tab shows the same folders.
--
-- One table for both trees (kind says which). A folder cannot be removed while something
-- is in it (the route checks; RESTRICT is the net under it). A lab test or an order set
-- whose folder is gone simply has none (SET NULL) and is listed at the top level.
-- order_set.group_name and order_code.group_name stay as they are: the order groups of the
-- doctor's order window (063) are another list, and old code that reads group_name still
-- finds it.
CREATE TABLE IF NOT EXISTS item_folder (
    id          SERIAL PRIMARY KEY,
    kind        VARCHAR(20) NOT NULL CHECK (kind IN ('lab', 'orderset')),
    parent_id   INTEGER REFERENCES item_folder(id) ON DELETE RESTRICT,
    name        VARCHAR(80) NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- two folders of the same name side by side would be one too many (capitals do not count)
CREATE UNIQUE INDEX IF NOT EXISTS item_folder_sibling_name
    ON item_folder (kind, COALESCE(parent_id, 0), lower(name));
CREATE INDEX IF NOT EXISTS item_folder_parent ON item_folder (parent_id);

ALTER TABLE order_set  ADD COLUMN IF NOT EXISTS folder_id     INTEGER REFERENCES item_folder(id) ON DELETE SET NULL;
ALTER TABLE order_code ADD COLUMN IF NOT EXISTS lab_folder_id INTEGER REFERENCES item_folder(id) ON DELETE SET NULL;

-- What exists already is filed once, at the top level: an order set under the group it
-- carried, a lab test under its order group. Nothing is lost if this finds nothing.
-- This runs once on the clinic's own data with nobody watching, so it must not be able to
-- fail: names that differ only by capitals or spaces are one folder (one spelling
-- is kept), a name longer than a folder's 80 characters is cut, and a row that would still
-- collide with a folder already there is simply left out (ON CONFLICT DO NOTHING) - its
-- sets or tests are then listed at the top level, where they can be filed by hand.
INSERT INTO item_folder (kind, name, sort_order)
SELECT 'orderset', g.name, (row_number() OVER (ORDER BY g.first_order, lower(g.name))) * 10
  FROM (SELECT MIN(left(btrim(group_name), 80)) AS name, MIN(sort_order) AS first_order
          FROM order_set
         WHERE group_name IS NOT NULL AND btrim(group_name) <> ''
         GROUP BY lower(left(btrim(group_name), 80))) g
ON CONFLICT DO NOTHING;
UPDATE order_set os
   SET folder_id = f.id
  FROM item_folder f
 WHERE os.folder_id IS NULL AND f.kind = 'orderset' AND f.parent_id IS NULL
   AND os.group_name IS NOT NULL AND btrim(os.group_name) <> ''
   AND lower(f.name) = lower(left(btrim(os.group_name), 80));

INSERT INTO item_folder (kind, name, sort_order)
SELECT 'lab', g.name, (row_number() OVER (ORDER BY lower(g.name))) * 10
  FROM (SELECT MIN(left(btrim(group_name), 80)) AS name
          FROM order_code
         WHERE code_type = 'lab' AND group_name IS NOT NULL AND btrim(group_name) <> ''
         GROUP BY lower(left(btrim(group_name), 80))) g
ON CONFLICT DO NOTHING;
UPDATE order_code oc
   SET lab_folder_id = f.id
  FROM item_folder f
 WHERE oc.lab_folder_id IS NULL AND oc.code_type = 'lab' AND f.kind = 'lab' AND f.parent_id IS NULL
   AND oc.group_name IS NOT NULL AND btrim(oc.group_name) <> ''
   AND lower(f.name) = lower(left(btrim(oc.group_name), 80));

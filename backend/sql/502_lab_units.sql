-- 502 (laboratory, session number):
-- the units a lab item can carry become a list the clinic keeps (director, 2026-10-01:
-- "pick the unit from a list instead of typing each one; a Unit list button to add and
-- remove them").
--
-- lab_unit is ONLY the list offered in Settings > Lab test items. Nothing refers to it:
-- an item keeps its unit as text in lab_test_item.unit, and a result keeps its own copy
-- in lab_result.unit, exactly as before. So removing or renaming a unit here never
-- changes an item, a result or what was printed -- it only changes what the list offers.
--
-- Filled once, when the table is empty:
--   1. the common units, in a fixed order (blood count first, then chemistry). Where an
--      item already writes one of them another way (mg/dl for mg/dL), the item's
--      spelling is taken, so every unit in use is in the list as it is written;
--   2. then any other unit an item uses, by name.
-- Guarded by "table is empty" and not by name, so running this again after the clinic
-- removed a unit does not bring it back.
--
-- Two units are the same when they differ only by capitals, spaces, or the two letters
-- for micro (µ U+00B5 and μ U+03BC look alike): the unique index refuses the second.
-- The length is that of lab_test_item.unit.
--
-- Adds a table and an index; changes no existing row. Safe to run more than once.

CREATE TABLE IF NOT EXISTS lab_unit (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(30) NOT NULL CHECK (btrim(name) <> ''),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS lab_unit_name_key
    ON lab_unit (lower(regexp_replace(translate(name, 'μ', 'µ'), '\s', '', 'g')));

INSERT INTO lab_unit (name, sort_order)
SELECT u.name, (ROW_NUMBER() OVER (ORDER BY u.grp, u.ord, lower(u.name)))::int
  FROM (
        -- 1. the common units; an item's own spelling of the same unit wins
        SELECT COALESCE(used.name, c.name) AS name, 1 AS grp, c.ord
          FROM (VALUES ('10^9/L', 1), ('10^12/L', 2), ('g/dL', 3), ('%', 4), ('fL', 5), ('pg', 6),
                       ('/µL', 7), ('mm/h', 8),
                       ('mg/dL', 9), ('g/L', 10), ('mg/L', 11), ('mmol/L', 12), ('µmol/L', 13),
                       ('mEq/L', 14), ('U/L', 15), ('IU/L', 16), ('mIU/L', 17), ('ng/mL', 18),
                       ('pg/mL', 19), ('µg/dL', 20), ('mL/min', 21), ('mL/min/1.73m²', 22),
                       ('sec', 23), ('/HPF', 24)) AS c(name, ord)
          LEFT JOIN (
                SELECT DISTINCT ON (k) k, name
                  FROM (SELECT lower(regexp_replace(translate(btrim(unit), 'μ', 'µ'), '\s', '', 'g')) AS k,
                               btrim(unit) AS name, COUNT(*) AS n
                          FROM lab_test_item WHERE btrim(unit) <> ''
                         GROUP BY 1, 2) x
                 ORDER BY k, n DESC, name
               ) used
            ON used.k = lower(regexp_replace(translate(c.name, 'μ', 'µ'), '\s', '', 'g'))
        UNION ALL
        -- 2. the units in use that are not among the common ones
        SELECT used.name, 2, 0
          FROM (
                SELECT DISTINCT ON (k) k, name
                  FROM (SELECT lower(regexp_replace(translate(btrim(unit), 'μ', 'µ'), '\s', '', 'g')) AS k,
                               btrim(unit) AS name, COUNT(*) AS n
                          FROM lab_test_item WHERE btrim(unit) <> ''
                         GROUP BY 1, 2) x
                 ORDER BY k, n DESC, name
               ) used
         WHERE used.k NOT IN ('10^9/l', '10^12/l', 'g/dl', '%', 'fl', 'pg', '/µl', 'mm/h', 'mg/dl', 'g/l',
                              'mg/l', 'mmol/l', 'µmol/l', 'meq/l', 'u/l', 'iu/l', 'miu/l', 'ng/ml',
                              'pg/ml', 'µg/dl', 'ml/min', 'ml/min/1.73m²', 'sec', '/hpf')
       ) u
 WHERE NOT EXISTS (SELECT 1 FROM lab_unit);
